import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'src/data/repository/citizen_repository.dart';
import 'src/features/citizen/citizen_cubit.dart';
import 'src/features/citizen/citizen_home_page.dart';

class QuickReachApp extends StatelessWidget {
  const QuickReachApp({super.key});

  @override
  Widget build(BuildContext context) {
    final repository = CitizenRepository();
    return BlocProvider(
      create: (_) => CitizenCubit(repository)..initialize(),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'QuickReach Citizen',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: Colors.red,
            brightness: Brightness.dark,
          ),
          scaffoldBackgroundColor: const Color(0xFF020617),
        ),
        home: const CitizenHomePage(),
      ),
    );
  }
}
