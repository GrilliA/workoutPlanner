package com.traccia.android.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Tokens ported from mobile/src/theme/colors.ts (Sole theme).
private val Accent = Color(0xFFFF7A45)
private val OnAccent = Color(0xFF231A14)
private val Bg = Color(0xFFFFF8F1)
private val TextHeading = Color(0xFF231A14)
private val Surface = Color(0xFFFFFFFF)
private val SurfaceElevated = Color(0xFFFFF8F1)
private val Text = Color(0xFF6F625A)
private val Danger = Color(0xFFB42318)
private val OnDanger = Color(0xFFFFFFFF)
private val Border = Color(0xFFF0E4D8)

// Sole uses the accent only as a fill: orange text on a light background fails contrast,
// so screens must not use `primary` for text or icons. N3 adds the accentText token.
private val TracciaColorScheme = lightColorScheme(
    primary = Accent,
    onPrimary = OnAccent,
    background = Bg,
    onBackground = TextHeading,
    surface = Surface,
    onSurface = TextHeading,
    surfaceVariant = SurfaceElevated,
    onSurfaceVariant = Text,
    error = Danger,
    onError = OnDanger,
    outline = Border,
)

@Composable
fun TracciaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TracciaColorScheme,
        content = content,
    )
}
