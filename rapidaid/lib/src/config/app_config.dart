class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    "QUICKREACH_API_URL",
    defaultValue: "http://10.0.2.2:3000",
  );
}
