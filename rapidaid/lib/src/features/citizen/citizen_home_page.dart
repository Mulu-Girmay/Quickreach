import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:rapidaid/src/data/models/incident_models.dart';
import 'package:rapidaid/src/features/citizen/citizen_state.dart';
import 'citizen_emergency_tools_sheet.dart';
import 'citizen_live_status_page.dart';
import 'citizen_cubit.dart';
import '../widgets/hold_panic_button.dart';

class CitizenHomePage extends StatefulWidget {
  const CitizenHomePage({super.key});

  @override
  State<CitizenHomePage> createState() => _CitizenHomePageState();
}

class _CitizenHomePageState extends State<CitizenHomePage> {
  final _phoneController = TextEditingController();
  final _descriptionController = TextEditingController();
  int _selectedIndex = 0;
  String? _lastAcceptedStatus;

  @override
  void dispose() {
    _phoneController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  String _formatDate(DateTime date) {
    return DateFormat("MMM d, h:mm a").format(date);
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<CitizenCubit, CitizenState>(
      listenWhen: (previous, current) =>
          previous.transientMessage != current.transientMessage ||
          previous.cachedIncidents != current.cachedIncidents ||
          previous.activeLocalId != current.activeLocalId,
      listener: (context, state) {
        if (state.transientMessage != null) {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              SnackBar(
                content: Text(state.transientMessage!),
                behavior: SnackBarBehavior.floating,
              ),
            );
        }

        final currentAccepted = _currentAcceptedIncident(state: state);
        final currentStatus = currentAccepted?.status;

        if (currentStatus != null && currentStatus != _lastAcceptedStatus) {
          _lastAcceptedStatus = currentStatus;
        }

        if (currentStatus == 'Dispatched' && _selectedIndex != 1) {
          setState(() => _selectedIndex = 1);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Dispatcher accepted your SOS. Opening live status.',
              ),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        if (_phoneController.text != state.reporterPhone) {
          _phoneController.value = TextEditingValue(
            text: state.reporterPhone,
            selection: TextSelection.collapsed(
              offset: state.reporterPhone.length,
            ),
          );
        }

        return Scaffold(
          backgroundColor: const Color(0xFF020617),
          floatingActionButton: _ChatFab(
            onPressed: () {
              final incident = context
                  .read<CitizenCubit>()
                  .activeSyncedIncident;
              showCitizenEmergencyToolsSheet(
                context: context,
                repository: context.read<CitizenCubit>().repository,
                incident: incident,
                initialTabIndex: 1,
              );
            },
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) {
              setState(() => _selectedIndex = index);
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'SOS',
              ),
              NavigationDestination(
                icon: Icon(Icons.map_outlined),
                selectedIcon: Icon(Icons.map),
                label: 'Live',
              ),
              NavigationDestination(
                icon: Icon(Icons.history_outlined),
                selectedIcon: Icon(Icons.history),
                label: 'History',
              ),
            ],
          ),
          body: SafeArea(
            child: IndexedStack(
              index: _selectedIndex,
              children: [
                _DashboardTab(
                  state: state,
                  phoneController: _phoneController,
                  descriptionController: _descriptionController,
                  onPhoneChanged: (value) =>
                      context.read<CitizenCubit>().setReporterPhone(value),
                  onDescriptionChanged: (value) =>
                      context.read<CitizenCubit>().setDescription(value),
                  onHoldTriggered: () =>
                      context.read<CitizenCubit>().triggerPanic(),
                  onCancel: (localId) =>
                      context.read<CitizenCubit>().cancelIncident(localId),
                  formatDate: _formatDate,
                  onOpenLive: () => setState(() => _selectedIndex = 1),
                ),
                CitizenLiveStatusPage(
                  repository: context.read<CitizenCubit>().repository,
                  incident: context.read<CitizenCubit>().activeSyncedIncident,
                ),
                _HistoryTab(state: state, formatDate: _formatDate),
              ],
            ),
          ),
        );
      },
    );
  }

  CachedIncidentRecord? _currentAcceptedIncident({
    required CitizenState state,
  }) {
    final active = state.activeLocalId;
    if (active != null) {
      for (final incident in state.cachedIncidents) {
        if (incident.localId == active) {
          return incident;
        }
      }
    }

    for (final incident in state.cachedIncidents) {
      if (incident.status == 'Dispatched' || incident.status == 'Resolved') {
        return incident;
      }
    }

    return state.cachedIncidents.isNotEmpty
        ? state.cachedIncidents.first
        : null;
  }
}

class _DashboardTab extends StatelessWidget {
  const _DashboardTab({
    required this.state,
    required this.phoneController,
    required this.descriptionController,
    required this.onPhoneChanged,
    required this.onDescriptionChanged,
    required this.onHoldTriggered,
    required this.onCancel,
    required this.formatDate,
    required this.onOpenLive,
  });

  final CitizenState state;
  final TextEditingController phoneController;
  final TextEditingController descriptionController;
  final ValueChanged<String> onPhoneChanged;
  final ValueChanged<String> onDescriptionChanged;
  final VoidCallback onHoldTriggered;
  final ValueChanged<String> onCancel;
  final String Function(DateTime) formatDate;
  final VoidCallback onOpenLive;

  @override
  Widget build(BuildContext context) {
    final liveIncident = _findAcceptedIncident(state);
    final dispatcherAccepted = liveIncident != null;
    final currentIncident = _findCurrentIncident(state);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF020617), Color(0xFF111827), Color(0xFF1E293B)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: RefreshIndicator(
        onRefresh: () => context.read<CitizenCubit>().refreshFromServer(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
          children: [
            _Header(state: state),
            const SizedBox(height: 18),
            if (!state.connected) _SignalBanner(state: state),
            if (state.showUssdHint) _UssdHintBanner(),
            if (dispatcherAccepted) ...[
              const SizedBox(height: 14),
              _DispatcherAcceptedBanner(onOpenLive: onOpenLive),
            ],
            const SizedBox(height: 18),
            _PanicPanel(
              state: state,
              phoneController: phoneController,
              descriptionController: descriptionController,
              onPhoneChanged: onPhoneChanged,
              onDescriptionChanged: onDescriptionChanged,
            ),
            const SizedBox(height: 18),
            HoldPanicButton(enabled: true, onTriggered: onHoldTriggered),
            const SizedBox(height: 18),
            _ActiveIncidentCard(state: state, onCancel: onCancel),
            const SizedBox(height: 18),
            if (currentIncident != null) ...[
              _CurrentIncidentSummaryCard(
                incident: currentIncident,
                formatDate: formatDate,
              ),
              const SizedBox(height: 18),
            ],
            const SizedBox(height: 18),
            _Footer(state: state),
          ],
        ),
      ),
    );
  }

  CachedIncidentRecord? _findAcceptedIncident(CitizenState state) {
    final active = state.activeLocalId;
    if (active != null) {
      for (final incident in state.cachedIncidents) {
        if (incident.localId == active &&
            (incident.status == 'Dispatched' ||
                incident.status == 'Resolved')) {
          return incident;
        }
      }
    }

    for (final incident in state.cachedIncidents) {
      if (incident.status == 'Dispatched' || incident.status == 'Resolved') {
        return incident;
      }
    }

    return null;
  }

  CachedIncidentRecord? _findCurrentIncident(CitizenState state) {
    final active = state.activeLocalId;
    if (active != null) {
      for (final incident in state.cachedIncidents) {
        if (incident.localId == active) {
          return incident;
        }
      }
    }

    for (final incident in state.cachedIncidents) {
      if (incident.status == 'Dispatched' || incident.status == 'Resolved') {
        return incident;
      }
    }

    return null;
  }
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab({required this.state, required this.formatDate});

  final CitizenState state;
  final String Function(DateTime) formatDate;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF020617), Color(0xFF111827), Color(0xFF1E293B)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
        children: [
          const _HistoryHeader(),
          const SizedBox(height: 14),
          _OfflineQueue(state: state),
          const SizedBox(height: 18),
          _CachedIncidents(state: state, formatDate: formatDate),
        ],
      ),
    );
  }
}

class _HistoryHeader extends StatelessWidget {
  const _HistoryHeader();

  @override
  Widget build(BuildContext context) {
    return const Text(
      'Incident History',
      style: TextStyle(
        color: Colors.white,
        fontSize: 24,
        fontWeight: FontWeight.w900,
      ),
    );
  }
}

class _CurrentIncidentSummaryCard extends StatelessWidget {
  const _CurrentIncidentSummaryCard({
    required this.incident,
    required this.formatDate,
  });

  final CachedIncidentRecord incident;
  final String Function(DateTime) formatDate;

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
            'Current Incident Snapshot',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '${incident.type} • ${incident.status}',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Updated ${formatDate(incident.updatedAt)}',
            style: TextStyle(color: Colors.white.withOpacity(0.65)),
          ),
          if (incident.etaMinutes != null) ...[
            const SizedBox(height: 6),
            Text(
              'ETA: ${incident.etaMinutes} mins',
              style: const TextStyle(
                color: Colors.redAccent,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DispatcherAcceptedBanner extends StatelessWidget {
  const _DispatcherAcceptedBanner({required this.onOpenLive});

  final VoidCallback onOpenLive;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF3B1D1D),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.redAccent.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Dispatcher accepted your SOS. Open Live to see status and map.',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 10),
          OutlinedButton(
            onPressed: onOpenLive,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white24),
            ),
            child: const Text('Live'),
          ),
        ],
      ),
    );
  }
}

class _ChatFab extends StatelessWidget {
  const _ChatFab({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: onPressed,
      backgroundColor: Colors.redAccent,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.chat_bubble_outline),
      label: const Text('Chat'),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.state});
  final CitizenState state;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: Colors.red.withOpacity(0.15),
            borderRadius: BorderRadius.circular(18),
          ),
          child: const Icon(Icons.sos, color: Colors.redAccent, size: 28),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "QuickReach Citizen",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                "Offline-first SOS with USSD fallback",
                style: TextStyle(
                  color: Colors.white.withOpacity(0.65),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        _Pill(
          label: state.connected ? "ONLINE" : "OFFLINE",
          color: state.connected ? Colors.redAccent : Colors.white70,
        ),
      ],
    );
  }
}

class _SignalBanner extends StatelessWidget {
  const _SignalBanner({required this.state});
  final CitizenState state;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF7C2D12).withOpacity(0.35),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.red.withOpacity(0.35)),
      ),
      child: Row(
        children: [
          const Icon(Icons.wifi_off, color: Colors.redAccent),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              state.showUssdHint
                  ? "No signal detected. Dial *123# to report via USSD."
                  : "Signal lost. We'll keep your SOS saved locally until data returns.",
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _UssdHintBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.redAccent.withOpacity(0.25)),
        ),
        child: const Text(
          "No signal detected. You can also dial *123# to report via USSD.",
          style: TextStyle(
            color: Colors.redAccent,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _PanicPanel extends StatelessWidget {
  const _PanicPanel({
    required this.state,
    required this.phoneController,
    required this.descriptionController,
    required this.onPhoneChanged,
    required this.onDescriptionChanged,
  });

  final CitizenState state;
  final TextEditingController phoneController;
  final TextEditingController descriptionController;
  final ValueChanged<String> onPhoneChanged;
  final ValueChanged<String> onDescriptionChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120).withOpacity(0.9),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Prepare SOS",
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: ["Medical", "Fire", "Police"]
                .map(
                  (type) => ChoiceChip(
                    label: Text(type),
                    selected: state.selectedType == type,
                    selectedColor: Colors.redAccent,
                    backgroundColor: const Color(0xFF1E293B),
                    labelStyle: TextStyle(
                      color: state.selectedType == type
                          ? Colors.white
                          : Colors.white70,
                      fontWeight: FontWeight.w700,
                    ),
                    onSelected: (_) =>
                        context.read<CitizenCubit>().setSelectedType(type),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: phoneController,
            onChanged: onPhoneChanged,
            keyboardType: TextInputType.phone,
            style: const TextStyle(color: Colors.white),
            decoration: _fieldDecoration("Reporter phone"),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: descriptionController,
            onChanged: onDescriptionChanged,
            minLines: 2,
            maxLines: 4,
            style: const TextStyle(color: Colors.white),
            decoration: _fieldDecoration("Optional description"),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _Pill(
                label: state.locationReady ? "GPS READY" : "GPS NEEDED",
                color: state.locationReady ? Colors.redAccent : Colors.white70,
              ),
              const SizedBox(width: 10),
              _Pill(
                label: state.syncing ? "SYNCING" : "LOCAL SAVE",
                color: state.syncing ? Colors.redAccent : Colors.white70,
              ),
            ],
          ),
        ],
      ),
    );
  }

  InputDecoration _fieldDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white54),
      filled: true,
      fillColor: const Color(0xFF111827),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
      ),
    );
  }
}

class _ActiveIncidentCard extends StatelessWidget {
  const _ActiveIncidentCard({required this.state, required this.onCancel});

  final CitizenState state;
  final ValueChanged<String> onCancel;

  @override
  Widget build(BuildContext context) {
    final localId = state.activeLocalId;
    if (localId == null) return const SizedBox.shrink();

    final incident = state.offlineIncidents.firstWhere(
      (item) => item.localId == localId,
      orElse: () => state.offlineIncidents.isNotEmpty
          ? state.offlineIncidents.first
          : OfflineIncidentRecord(
              localId: localId,
              type: state.selectedType,
              lat: 0,
              lng: 0,
              reporterPhone: state.reporterPhone,
              description: state.description,
              clientCreatedAt: DateTime.now(),
              offlineCreated: true,
              syncStatus: "saved_locally",
              status: "Saved locally",
            ),
    );

    final canCancel = state.canUndo && incident.syncStatus != "sent";
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.redAccent.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Current Incident",
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _Pill(
                label: incident.syncStatus.toUpperCase(),
                color: Colors.white70,
              ),
              const SizedBox(width: 10),
              if (incident.offlineCreated)
                _Pill(label: "OFFLINE CREATED", color: Colors.redAccent),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            "${incident.type} SOS • ${incident.reporterPhone}",
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            "${incident.description}\nCreated: ${incident.clientCreatedAt.toLocal()}",
            style: TextStyle(color: Colors.white.withOpacity(0.7)),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (canCancel)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => onCancel(localId),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white24),
                    ),
                    child: const Text("Cancel within 8s"),
                  ),
                ),
              if (canCancel) const SizedBox(width: 10),
              Expanded(
                child: Text(
                  incident.syncStatus == "sent"
                      ? "Sent to dispatch"
                      : incident.status,
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                    color: Colors.redAccent,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OfflineQueue extends StatelessWidget {
  const _OfflineQueue({required this.state});
  final CitizenState state;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Local Queue",
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 12),
          if (state.offlineIncidents.isEmpty)
            Text(
              "No local incidents yet.",
              style: TextStyle(color: Colors.white.withOpacity(0.6)),
            )
          else
            ...state.offlineIncidents
                .take(3)
                .map(
                  (incident) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _QueueTile(incident: incident),
                  ),
                ),
        ],
      ),
    );
  }
}

class _QueueTile extends StatelessWidget {
  const _QueueTile({required this.incident});
  final OfflineIncidentRecord incident;

  @override
  Widget build(BuildContext context) {
    final isSent = incident.syncStatus == "sent";
    final isCancelled = incident.syncStatus == "cancelled";
    final color = isSent
        ? Colors.redAccent
        : isCancelled
        ? Colors.redAccent
        : Colors.white70;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "${incident.type} • ${incident.status}",
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _date(incident.clientCreatedAt),
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          _Pill(label: incident.syncStatus, color: color),
        ],
      ),
    );
  }

  String _date(DateTime value) => DateFormat("MMM d • h:mm a").format(value);
}

class _CachedIncidents extends StatelessWidget {
  const _CachedIncidents({required this.state, required this.formatDate});

  final CitizenState state;
  final String Function(DateTime) formatDate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Incident Status Cache",
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 12),
          if (state.cachedIncidents.isEmpty)
            Text(
              "Waiting for connection to get status.",
              style: TextStyle(color: Colors.white.withOpacity(0.6)),
            )
          else
            ...state.cachedIncidents
                .take(5)
                .map(
                  (incident) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _CachedTile(
                      incident: incident,
                      formatDate: formatDate,
                    ),
                  ),
                ),
        ],
      ),
    );
  }
}

class _CachedTile extends StatelessWidget {
  const _CachedTile({required this.incident, required this.formatDate});

  final CachedIncidentRecord incident;
  final String Function(DateTime) formatDate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "${incident.type} • ${incident.status}",
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  "Updated ${formatDate(incident.updatedAt)}",
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 12,
                  ),
                ),
                if (incident.etaMinutes != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      "ETA: ${incident.etaMinutes} mins",
                      style: const TextStyle(
                        color: Colors.redAccent,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (incident.offlineCreated)
            _Pill(label: "Delayed report", color: Colors.redAccent),
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.state});
  final CitizenState state;

  @override
  Widget build(BuildContext context) {
    return Text(
      state.locationReady
          ? "GPS is ready. Hold the red button for 3 seconds to trigger SOS."
          : "Enable location so QuickReach can capture your coordinates offline.",
      textAlign: TextAlign.center,
      style: TextStyle(color: Colors.white.withOpacity(0.55), fontSize: 12),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}
