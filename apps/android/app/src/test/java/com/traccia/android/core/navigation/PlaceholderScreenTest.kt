package com.traccia.android.core.navigation

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.RobolectricDeviceQualifiers
import com.github.takahirom.roborazzi.captureRoboImage
import com.traccia.android.core.designsystem.TracciaTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
// Robolectric sandbox for SDK 36 needs Java 21; this project builds with JDK 17.
@Config(sdk = [35], qualifiers = RobolectricDeviceQualifiers.Pixel7)
class PlaceholderScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun placeholderScreen_showsName() {
        composeRule.setContent {
            TracciaTheme {
                PlaceholderScreen("Login")
            }
        }
        composeRule.onRoot().captureRoboImage()
        composeRule.onNodeWithText("Login").assertIsDisplayed()
    }
}
