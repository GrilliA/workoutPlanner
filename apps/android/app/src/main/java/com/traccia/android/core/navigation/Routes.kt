package com.traccia.android.core.navigation

import kotlinx.serialization.Serializable

@Serializable
data object Login

@Serializable
data object Register

@Serializable
data object Main

@Serializable
data object Home

@Serializable
data object Workouts

@Serializable
data object Stats

@Serializable
data object Account

@Serializable
data class WorkoutDetail(val workoutId: Long)

@Serializable
data class WorkoutEditor(val workoutId: Long? = null)

@Serializable
data class Session(val sessionId: Long)

@Serializable
data class SessionComplete(val sessionId: Long)
