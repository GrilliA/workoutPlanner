package expo.modules.resttimernotification

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

internal const val REST_TIMER_ONGOING_NOTIFICATION_ID = 4201
internal const val REST_TIMER_DONE_NOTIFICATION_ID = 4202

private const val ACTION_REST_DONE = "expo.modules.resttimernotification.REST_DONE"
private const val EXTRA_SESSION_ID = "sessionId"
private const val EXTRA_TITLE = "title"
private const val EXTRA_BODY = "body"
private const val ALARM_REQUEST_CODE = 4203
private const val SHOW_REQUEST_CODE = 4204
private const val DONE_CHANNEL_ID = "rest-timer"
private const val PREFS_NAME = "rest-timer-notification"
private const val EXACT_ALARM_PROMPTED_KEY = "exact-alarm-prompted"
private const val NOTIFICATION_COLOR = 0xFFBFDBF7.toInt()

internal object RestTimerDoneAlarm {
  @Volatile
  var sessionMounted: Boolean = false

  @Volatile
  var activityInForeground: Boolean = false

  val suppressNotification: Boolean
    get() = sessionMounted && activityInForeground

  fun schedule(context: Context, sessionId: Int, endsAtMs: Long, title: String, body: String): Boolean {
    if (!canScheduleExact(context)) {
      return false
    }

    // Alarm clock: fires at endsAtMs while the phone is idle, also on the next rests.
    val operation = donePendingIntent(context, sessionId, title, body, PendingIntent.FLAG_UPDATE_CURRENT)
      ?: return false

    return try {
      ensureDoneChannel(context)
      alarmManager(context).setAlarmClock(
        AlarmManager.AlarmClockInfo(endsAtMs, sessionPendingIntent(context, sessionId, SHOW_REQUEST_CODE)),
        operation,
      )
      true
    } catch (_: SecurityException) {
      false
    }
  }

  fun cancel(context: Context) {
    val pendingIntent = donePendingIntent(context, 0, "", "", PendingIntent.FLAG_NO_CREATE)
    if (pendingIntent != null) {
      alarmManager(context).cancel(pendingIntent)
    }
    NotificationManagerCompat.from(context).cancel(REST_TIMER_DONE_NOTIFICATION_ID)
  }

  fun promptOnce(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || canScheduleExact(context)) {
      return
    }

    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    if (prefs.getBoolean(EXACT_ALARM_PROMPTED_KEY, false)) {
      return
    }
    if (!prefs.edit().putBoolean(EXACT_ALARM_PROMPTED_KEY, true).commit()) {
      return
    }

    val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
      data = Uri.parse("package:${context.packageName}")
      if (context !is android.app.Activity) {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
    }

    try {
      context.startActivity(intent)
    } catch (_: android.content.ActivityNotFoundException) {
      prefs.edit().putBoolean(EXACT_ALARM_PROMPTED_KEY, false).apply()
    } catch (_: SecurityException) {
      prefs.edit().putBoolean(EXACT_ALARM_PROMPTED_KEY, false).apply()
    }
  }

  fun show(context: Context, sessionId: Int, title: String, body: String) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }

    ensureDoneChannel(context)

    val notification = NotificationCompat.Builder(context, DONE_CHANNEL_ID)
      .setSmallIcon(notificationSmallIcon(context))
      .setColor(NOTIFICATION_COLOR)
      .setContentTitle(title)
      .setContentText(body)
      .setAutoCancel(true)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(sessionPendingIntent(context, sessionId, SHOW_REQUEST_CODE))
      .build()

    NotificationManagerCompat.from(context).notify(REST_TIMER_DONE_NOTIFICATION_ID, notification)
  }
}

class RestTimerDoneReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != ACTION_REST_DONE) {
      return
    }

    val sessionId = intent.getIntExtra(EXTRA_SESSION_ID, -1)
    if (sessionId < 0) {
      return
    }

    NotificationManagerCompat.from(context).cancel(REST_TIMER_ONGOING_NOTIFICATION_ID)
    if (RestTimerDoneAlarm.suppressNotification) {
      return
    }

    RestTimerDoneAlarm.show(
      context,
      sessionId,
      intent.getStringExtra(EXTRA_TITLE) ?: "Recupero finito",
      intent.getStringExtra(EXTRA_BODY) ?: "Vai con la prossima serie",
    )
  }
}

internal fun notificationSmallIcon(context: Context): Int {
  val notificationIcon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
  if (notificationIcon != 0) {
    return notificationIcon
  }
  val launcherIcon = context.resources.getIdentifier("ic_launcher", "mipmap", context.packageName)
  return if (launcherIcon != 0) launcherIcon else android.R.drawable.ic_dialog_info
}

private fun canScheduleExact(context: Context): Boolean {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
    return true
  }
  return alarmManager(context).canScheduleExactAlarms()
}

private fun alarmManager(context: Context): AlarmManager {
  return context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
}

private fun ensureDoneChannel(context: Context) {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
    return
  }

  val manager = context.getSystemService(NotificationManager::class.java) ?: return
  if (manager.getNotificationChannel(DONE_CHANNEL_ID) != null) {
    return
  }

  val channel = NotificationChannel(DONE_CHANNEL_ID, "Recupero", NotificationManager.IMPORTANCE_HIGH).apply {
    vibrationPattern = longArrayOf(0, 250, 120, 250)
    enableVibration(true)
    lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
    lightColor = NOTIFICATION_COLOR
    setSound(
      Settings.System.DEFAULT_NOTIFICATION_URI,
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build(),
    )
  }
  manager.createNotificationChannel(channel)
}

private fun donePendingIntent(
  context: Context,
  sessionId: Int,
  title: String,
  body: String,
  createFlag: Int,
): PendingIntent? {
  val intent = Intent(context, RestTimerDoneReceiver::class.java).apply {
    action = ACTION_REST_DONE
    setPackage(context.packageName)
    if (createFlag != PendingIntent.FLAG_NO_CREATE) {
      putExtra(EXTRA_SESSION_ID, sessionId)
      putExtra(EXTRA_TITLE, title)
      putExtra(EXTRA_BODY, body)
    }
  }
  return PendingIntent.getBroadcast(
    context,
    ALARM_REQUEST_CODE,
    intent,
    createFlag or PendingIntent.FLAG_IMMUTABLE,
  )
}

private fun sessionPendingIntent(context: Context, sessionId: Int, requestCode: Int): PendingIntent {
  val intent = Intent(Intent.ACTION_VIEW, Uri.parse("traccia://session/$sessionId")).apply {
    setPackage(context.packageName)
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
  }
  return PendingIntent.getActivity(
    context,
    requestCode,
    intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )
}
