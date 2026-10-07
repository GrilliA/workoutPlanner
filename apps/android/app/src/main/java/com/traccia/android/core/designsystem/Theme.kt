package com.traccia.android.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Tokens ported from mobile/src/theme/colors.ts.
private val Accent = Color(0xFFBFDBF7)
private val OnAccent = Color(0xFF111111)
private val Bg = Color(0xFF1D1F25)
private val TextHeading = Color(0xFFE0E0E0)
private val Surface = Color(0xFF252830)
private val SurfaceElevated = Color(0xFF2C3038)
private val Text = Color(0xFFAAAAAA)
private val Danger = Color(0xFFF87171)
private val Muted = Color(0xFF666666)

private val TracciaDarkColorScheme = darkColorScheme(
    primary = Accent,
    onPrimary = OnAccent,
    background = Bg,
    onBackground = TextHeading,
    surface = Surface,
    onSurface = TextHeading,
    surfaceVariant = SurfaceElevated,
    onSurfaceVariant = Text,
    error = Danger,
    outline = Muted,
)

@Composable
fun TracciaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TracciaDarkColorScheme,
        content = content,
    )
}
