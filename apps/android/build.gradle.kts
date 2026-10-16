plugins {
    alias(libs.plugins.android.application) apply false
    // AGP 9 built-in Kotlin: the plugin is declared (not applied) so the
    // Kotlin Gradle plugin version on the classpath is pinned to `kotlin`.
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose.compiler) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.roborazzi) apply false
}
