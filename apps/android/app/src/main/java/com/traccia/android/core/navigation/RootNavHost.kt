package com.traccia.android.core.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

@Composable
fun RootNavHost() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = Login) {
        composable<Login> { PlaceholderScreen("Login") }
        composable<Register> { PlaceholderScreen("Register") }
        composable<Main> { PlaceholderScreen("Main") }
        composable<WorkoutDetail> { PlaceholderScreen("WorkoutDetail") }
        composable<WorkoutEditor> { PlaceholderScreen("WorkoutEditor") }
        composable<Session> { PlaceholderScreen("Session") }
        composable<SessionComplete> { PlaceholderScreen("SessionComplete") }
    }
}
