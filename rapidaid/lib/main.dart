import 'package:flutter/widgets.dart';
import 'package:rapidaid/app.dart';
import 'package:rapidaid/src/services/background_sync.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await BackgroundSyncService.initialize();
  runApp(const QuickReachApp());
}
