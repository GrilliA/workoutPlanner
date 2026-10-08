package expo.modules.resttimernotification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val CHANNEL_ID = "rest-timer-ongoing"
private const val NOTIFICATION_COLOR = 0xFFBFDBF7.toInt()

class RestTimerNotificationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RestTimerNotification")

    OnCreate {
      RestTimerDoneAlarm.activityInForeground = appContext.currentActivity != null
    }

    OnActivityEntersForeground {
      RestTimerDoneAlarm.activityInForeground = true
    }

    OnActivityEntersBackground {
      RestTimerDoneAlarm.activityInForeground = false
    }

    Function("showRestTimerNotification") { sessionId: Int, endsAtMs: Long, title: String, body: String ->
      show(sessionId, endsAtMs, title, body)
    }

    Function("dismissRestTimerNotification") {
      dismiss()
    }

    Function("scheduleRestDoneAlarm") { sessionId: Int, endsAtMs: Long, title: String, body: String ->
      val currentContext = context()
      if (currentContext == null) {
        false
      } else {
        RestTimerDoneAlarm.schedule(currentContext, sessionId, endsAtMs, title, body)
      }
    }

    Function("setRestTimerSessionMounted") { mounted: Boolean ->
      RestTimerDoneAlarm.sessionMounted = mounted
    }

    Function("promptExactRestAlarmOnce") {
      val host = appContext.currentActivity ?: context()
      if (host != null) {
        RestTimerDoneAlarm.promptOnce(host)
      }
    }
  }

  private fun context(): Context? = appContext.reactContext

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val channel = NotificationChannel(CHANNEL_ID, "Recupero in corso", NotificationManager.IMPORTANCE_LOW)
    context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
  }

  private fun sessionIntent(context: Context, sessionId: Int, suffix: String, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("traccia://session/$sessionId$suffix")).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  private fun show(sessionId: Int, endsAtMs: Long, title: String, body: String) {
    val context = context() ?: return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }

    ensureChannel(context)

    val now = System.currentTimeMillis()
    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(notificationSmallIcon(context))
      .setColor(NOTIFICATION_COLOR)
      .setContentTitle(title)
      .setContentText(body)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setWhen(endsAtMs)
      .setShowWhen(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setTimeoutAfter(maxOf(0L, endsAtMs - now))
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(sessionIntent(context, sessionId, "", 0))
      .addAction(
        0,
        "Salta",
        sessionIntent(context, sessionId, "?rest=skip", 1),
      )
      .setRequestPromotedOngoing(true)

    NotificationManagerCompat.from(context).notify(REST_TIMER_ONGOING_NOTIFICATION_ID, builder.build())
  }

  private fun dismiss() {
    val context = context() ?: return
    NotificationManagerCompat.from(context).cancel(REST_TIMER_ONGOING_NOTIFICATION_ID)
    RestTimerDoneAlarm.cancel(context)
  }
}
