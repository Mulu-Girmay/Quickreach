import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../data/models/incident_models.dart';
import '../../data/repository/citizen_repository.dart';
import 'citizen_cubit.dart';
import '../../services/socket_service.dart';

class CitizenLiveStatusPage extends StatefulWidget {
  const CitizenLiveStatusPage({
    super.key,
    required this.repository,
    required this.incident,
  });

  final CitizenRepository repository;
  final CachedIncidentRecord? incident;

  @override
  State<CitizenLiveStatusPage> createState() => _CitizenLiveStatusPageState();
}

class _CitizenLiveStatusPageState extends State<CitizenLiveStatusPage> {
  final SocketService _socketService = SocketService();
  StreamSubscription? _incidentSubscription;
  Timer? _statusPulseTimer;

  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _incidentDetails;
  String? _lastStatus;
  bool _statusPulse = false;

  String? get _incidentId =>
      widget.incident?.serverIncidentId.isNotEmpty == true
      ? widget.incident!.serverIncidentId
      : null;

  bool get _hasIncident => _incidentId != null;

  @override
  void initState() {
    super.initState();
    _loadIncident();
  }

  @override
  void dispose() {
    _incidentSubscription?.cancel();
    _statusPulseTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadIncident() async {
    final incidentId = _incidentId;
    if (incidentId == null) {
      if (!mounted) return;
      setState(() => _loading = false);
      return;
    }

    try {
      final data = await widget.repository.fetchIncidentDetails(incidentId);
      if (!mounted) return;

      setState(() {
        _incidentDetails = data;
        _loading = false;
        _error = null;
        _lastStatus = data['status']?.toString();
        _statusPulse = false;
      });

      await _socketService.connect();
      _socketService.joinIncidentRoom(incidentId);
      _incidentSubscription ??= _socketService.incidentStream.listen((event) {
        final payload = event['data'];
        if (payload is! Map) return;
        final incident = Map<String, dynamic>.from(payload);
        if (!mounted) return;

        final nextStatus = incident['status']?.toString();
        final shouldPulse = nextStatus != null && nextStatus != _lastStatus;
        setState(() {
          _incidentDetails = incident;
          if (nextStatus != null) {
            _lastStatus = nextStatus;
          }
          _statusPulse = shouldPulse;
        });
        _statusPulseTimer?.cancel();
        _statusPulseTimer = Timer(const Duration(milliseconds: 900), () {
          if (!mounted) return;
          setState(() => _statusPulse = false);
        });
        context.read<CitizenCubit>().refreshCurrentIncidentFromServer();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Unable to load live dispatcher status.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final incident = _incidentDetails;
    final status = incident?['status']?.toString() ?? 'Pending';
    final type =
        incident?['type']?.toString() ?? widget.incident?.type ?? 'Medical';
    final assignedName = incident?['assigned_volunteer_name']?.toString();
    final eta = incident?['eta_minutes']?.toString();
    final lat = _parseDouble(incident?['lat']) ?? widget.incident?.lat;
    final lng = _parseDouble(incident?['lng']) ?? widget.incident?.lng;

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      children: [
        _PageHeader(
          title: 'Dispatcher Live Status',
          subtitle: _hasIncident
              ? 'Track acceptance, arrival, and closure in one place.'
              : 'No synced incident yet. Start an SOS from the home page first.',
        ),
        const SizedBox(height: 14),
        if (_loading)
          const _LoadingCard()
        else if (_error != null)
          _NoticeCard(text: _error!)
        else ...[
          _IncidentMetaCard(
            type: type,
            status: status,
            assignedName: assignedName,
            eta: eta,
          ),
          const SizedBox(height: 14),
          _StatusStepper(status: status),
          const SizedBox(height: 14),
          _MapCard(
            lat: lat,
            lng: lng,
            incidentType: type,
            status: status,
            animate: _statusPulse,
          ),
          const SizedBox(height: 14),
          _StatusDetails(assignedName: assignedName, eta: eta, status: status),
        ],
      ],
    );
  }

  double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }
}

class _PageHeader extends StatelessWidget {
  const _PageHeader({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: TextStyle(color: Colors.white.withOpacity(0.65), height: 1.4),
        ),
      ],
    );
  }
}

class _IncidentMetaCard extends StatelessWidget {
  const _IncidentMetaCard({
    required this.type,
    required this.status,
    required this.assignedName,
    required this.eta,
  });

  final String type;
  final String status;
  final String? assignedName;
  final String? eta;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$type SOS',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 280),
            child: Wrap(
              key: ValueKey<String>(status),
              spacing: 8,
              runSpacing: 8,
              children: [
                _Badge(label: status),
                if (assignedName != null && assignedName!.isNotEmpty)
                  _Badge(label: assignedName!),
                if (eta != null && eta!.isNotEmpty)
                  _Badge(label: 'ETA $eta min'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusStepper extends StatelessWidget {
  const _StatusStepper({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final normalized = status.toLowerCase();
    final steps = [
      _StepItem('SOS Alert', true),
      _StepItem(
        'Dispatched',
        normalized == 'dispatched' || normalized == 'resolved',
      ),
      _StepItem(
        'En Route',
        normalized == 'dispatched' || normalized == 'resolved',
      ),
      _StepItem('Resolved', normalized == 'resolved'),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Dispatcher Status',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 14),
          for (var i = 0; i < steps.length; i++) ...[
            _TimelineStepRow(item: steps[i]),
            if (i != steps.length - 1)
              Container(
                margin: const EdgeInsets.only(left: 10),
                width: 2,
                height: 18,
                color: steps[i + 1].completed || steps[i].completed
                    ? Colors.redAccent.withOpacity(0.4)
                    : Colors.white12,
              ),
          ],
        ],
      ),
    );
  }
}

class _MapCard extends StatelessWidget {
  const _MapCard({
    required this.lat,
    required this.lng,
    required this.incidentType,
    required this.status,
    required this.animate,
  });

  final double? lat;
  final double? lng;
  final String incidentType;
  final String status;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final hasCoordinates = lat != null && lng != null;
    final center = LatLng(lat ?? 9.03, lng ?? 38.75);

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.map_outlined, color: Colors.redAccent),
                const SizedBox(width: 10),
                const Text(
                  'Live Map',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                const Spacer(),
                _Badge(label: status),
              ],
            ),
          ),
          SizedBox(
            height: 260,
            child: hasCoordinates
                ? Stack(
                    children: [
                      FlutterMap(
                        options: MapOptions(
                          initialCenter: center,
                          initialZoom: 15,
                        ),
                        children: [
                          TileLayer(
                            urlTemplate:
                                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'com.quickreach.rapidaid',
                          ),
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: center,
                                width: 72,
                                height: 72,
                                child: _PulsingMarker(animate: animate),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Positioned(
                        top: 12,
                        right: 12,
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 250),
                          child: _Badge(label: status),
                        ),
                      ),
                    ],
                  )
                : const Center(
                    child: Text(
                      'Waiting for incident coordinates.',
                      style: TextStyle(color: Colors.white70),
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              hasCoordinates
                  ? 'Incident location pinned for dispatcher tracking.'
                  : 'A live pin will appear once the incident reaches the server.',
              style: TextStyle(color: Colors.white.withOpacity(0.65)),
            ),
          ),
        ],
      ),
    );
  }
}

class _PulsingMarker extends StatefulWidget {
  const _PulsingMarker({required this.animate});

  final bool animate;

  @override
  State<_PulsingMarker> createState() => _PulsingMarkerState();
}

class _PulsingMarkerState extends State<_PulsingMarker>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.animate) {
      return const Icon(Icons.location_on, size: 48, color: Colors.redAccent);
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final scale = 1.0 + (_controller.value * 0.18);
        final opacity = 0.55 + (_controller.value * 0.25);
        return Transform.scale(
          scale: scale,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 52 + (_controller.value * 14),
                height: 52 + (_controller.value * 14),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.redAccent.withValues(alpha: 0.12 * opacity),
                  border: Border.all(
                    color: Colors.redAccent.withValues(alpha: 0.35 * opacity),
                    width: 2,
                  ),
                ),
              ),
              const Icon(Icons.location_on, size: 48, color: Colors.redAccent),
            ],
          ),
        );
      },
    );
  }
}

class _StatusDetails extends StatelessWidget {
  const _StatusDetails({
    required this.assignedName,
    required this.eta,
    required this.status,
  });

  final String? assignedName;
  final String? eta;
  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Live Details',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          _DetailRow(label: 'Status', value: status),
          _DetailRow(
            label: 'Responder',
            value: assignedName?.isNotEmpty == true
                ? assignedName!
                : 'Not assigned yet',
          ),
          _DetailRow(
            label: 'ETA',
            value: eta?.isNotEmpty == true ? '$eta minutes' : 'Updating',
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          SizedBox(
            width: 84,
            child: Text(
              label,
              style: TextStyle(color: Colors.white.withOpacity(0.55)),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 260,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: const CircularProgressIndicator(color: Colors.redAccent),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF3B1D1D),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.redAccent.withOpacity(0.25)),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.redAccent.withOpacity(0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.redAccent.withOpacity(0.24)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _StepItem {
  const _StepItem(this.label, this.completed);

  final String label;
  final bool completed;
}

class _TimelineStepRow extends StatelessWidget {
  const _TimelineStepRow({required this.item});

  final _StepItem item;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: item.completed ? Colors.redAccent : Colors.white12,
            shape: BoxShape.circle,
          ),
          child: item.completed
              ? const Icon(Icons.check, size: 12, color: Colors.white)
              : null,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Text(
              item.label,
              style: TextStyle(
                color: item.completed ? Colors.white : Colors.white54,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
