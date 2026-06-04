import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'src/data/repository/citizen_repository.dart';
import 'src/features/citizen/citizen_cubit.dart';
import 'src/features/citizen/citizen_home_page.dart';

class QuickReachApp extends StatelessWidget {
  const QuickReachApp({super.key});

  static final CitizenRepository _repository = CitizenRepository();

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => CitizenCubit(_repository)..initialize(),
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
