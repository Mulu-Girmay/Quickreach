class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    "QUICKREACH_API_URL",
    defaultValue: "https://quickreach-1.onrender.com",
  );
}
