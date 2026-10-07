pluginManagement {
    repositories {
        google()
        // Read-only Google Cloud Storage mirror of Maven Central, before the
        // plugin portal (its redirects to Central can hit HTTP 429).
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        // Read-only Google Cloud Storage mirror of Maven Central (see above).
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
    }
}

rootProject.name = "traccia-android"
include(":app")
