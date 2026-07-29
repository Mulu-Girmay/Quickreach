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

class _HoldPanicButtonState extends State<HoldPanicButton>
    with SingleTickerProviderStateMixin {
  Timer? _timer;
  double _progress = 0.0;
  bool _holding = false;
  bool _triggered = false;

  void _startHold() {
    if (!widget.enabled || _holding || _triggered) return;

    setState(() {
      _holding = true;
      _triggered = false;
      _progress = 0.0;
    });

    const totalDurationMs = 3000;
    const intervalMs = 16; // ~60fps smooth updates
    const totalTicks = totalDurationMs / intervalMs;
    var currentTick = 0;

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: intervalMs), (timer) {
      currentTick++;
      if (!mounted) {
        timer.cancel();
        return;
      }

      final newProgress = (currentTick / totalTicks).clamp(0.0, 1.0);
      setState(() {
        _progress = newProgress;
      });

      if (currentTick >= totalTicks) {
        timer.cancel();
        _holding = false;
        _triggered = true;
        widget.onTriggered();
        _resetAfterTrigger();
      }
    });
  }

  void _resetHold() {
    if (_triggered) return; // Don't reset prematurely if already triggered
    _timer?.cancel();
    _timer = null;
    if (mounted) {
      setState(() {
        _holding = false;
        _progress = 0.0;
      });
    }
  }

  void _resetAfterTrigger() {
    _timer?.cancel();
    _timer = null;
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) {
        setState(() {
          _holding = false;
          _triggered = false;
          _progress = 0.0;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final remainingSeconds = ((1.0 - _progress) * 3.0).clamp(0.0, 3.0);
    final isEnabled = widget.enabled;

    return Listener(
      onPointerDown: (_) => _startHold(),
      onPointerUp: (_) => _resetHold(),
      onPointerCancel: (_) => _resetHold(),
      child: AnimatedScale(
        scale: _holding ? 0.97 : (_triggered ? 1.03 : 1.0),
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOutCubic,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: double.infinity,
          height: 220,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: _triggered
                  ? [const Color(0xFF16A34A), const Color(0xFF15803D)]
                  : isEnabled
                      ? [
                          Color.lerp(const Color(0xFFEF4444), const Color(0xFFDC2626), _progress)!,
                          Color.lerp(const Color(0xFF991B1B), const Color(0xFF7F1D1D), _progress)!,
                        ]
                      : [const Color(0xFF374151), const Color(0xFF1F2937)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(36),
            boxShadow: [
              BoxShadow(
                color: _triggered
                    ? Colors.green.withOpacity(0.5)
                    : isEnabled
                        ? Colors.red.withOpacity(0.25 + (_progress * 0.35))
                        : Colors.black26,
                blurRadius: _holding ? 32 + (_progress * 16) : 24,
                spreadRadius: _holding ? 2 + (_progress * 4) : 0,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Outer Progress Ring
              SizedBox(
                width: 175,
                height: 175,
                child: CircularProgressIndicator(
                  value: _triggered ? 1.0 : _progress,
                  strokeWidth: _holding ? 12 : 9,
                  backgroundColor: Colors.white.withOpacity(0.15),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    _triggered ? Colors.white : (isEnabled ? const Color(0xFFFFE4E6) : Colors.white30),
                  ),
                ),
              ),

              // Pulse Effect Ring when holding
              if (_holding)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 50),
                  width: 140 + (_progress * 25),
                  height: 140 + (_progress * 25),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.05 + (_progress * 0.1)),
                  ),
                ),

              // Center Content & Live Feedback
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: _triggered
                        ? const Icon(
                            Icons.check_circle_rounded,
                            key: ValueKey('check'),
                            color: Colors.white,
                            size: 56,
                          )
                        : Icon(
                            _holding ? Icons.error_rounded : Icons.warning_amber_rounded,
                            key: ValueKey(_holding ? 'holding' : 'idle'),
                            color: Colors.white,
                            size: 52,
                          ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _triggered
                        ? "SOS SENT!"
                        : _holding
                            ? "HOLDING... ${remainingSeconds.toStringAsFixed(1)}s"
                            : "HOLD 3 SECONDS",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: _holding ? 15 : 14,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _triggered
                        ? "HELP IS ON THE WAY"
                        : _holding
                            ? "${(_progress * 100).toInt()}% COMPLETED"
                            : "Emergency SOS",
                    style: TextStyle(
                      color: Colors.white.withOpacity(_holding ? 0.9 : 0.8),
                      fontSize: _holding ? 14 : 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
