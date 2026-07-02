import 'dart:async';

import 'package:flutter/material.dart';

class HoldPanicButton extends StatefulWidget {
  const HoldPanicButton({
    super.key,
    required this.enabled,
    required this.onTriggered,
  });

  final bool enabled;
  final VoidCallback onTriggered;

  @override
  State<HoldPanicButton> createState() => _HoldPanicButtonState();
}

class _HoldPanicButtonState extends State<HoldPanicButton> {
  Timer? _timer;
  double _progress = 0;
  bool _holding = false;

  void _startHold() {
    if (!widget.enabled || _holding) return;
    _holding = true;
    _progress = 0;
    const steps = 60;
    var tick = 0;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      tick += 1;
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        _progress = tick / steps;
      });
      if (tick >= steps) {
        timer.cancel();
        _holding = false;
        widget.onTriggered();
        _reset(afterTrigger: true);
      }
    });
  }

  void _reset({bool afterTrigger = false}) {
    _timer?.cancel();
    _timer = null;
    if (mounted) {
      setState(() {
        _holding = false;
        _progress = afterTrigger ? 1 : 0;
      });
      if (!afterTrigger) {
        Future.delayed(const Duration(milliseconds: 250), () {
          if (mounted) {
            setState(() => _progress = 0);
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _startHold(),
      onTapUp: (_) => _reset(),
      onTapCancel: _reset,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: double.infinity,
        height: 220,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: widget.enabled
                ? [const Color(0xFFEF4444), const Color(0xFF991B1B)]
                : [const Color(0xFF7F1D1D), const Color(0xFF111827)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(36),
          boxShadow: [
            BoxShadow(
              color: Colors.red.withOpacity(0.25),
              blurRadius: 24,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              width: 180,
              height: 180,
              child: CircularProgressIndicator(
                value: _progress,
                strokeWidth: 10,
                backgroundColor: Colors.white.withOpacity(0.2),
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.warning_amber_rounded,
                  color: Colors.white,
                  size: 52,
                ),
                const SizedBox(height: 8),
                Text(
                  _holding ? "KEEP HOLDING" : "HOLD 3 SECONDS",
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  "Emergency SOS",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
