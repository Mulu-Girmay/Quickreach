import 'package:flutter/widgets.dart';

import 'app.dart';
import 'src/services/background_sync.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await BackgroundSyncService.initialize();
  runApp(const QuickReachApp());
}
