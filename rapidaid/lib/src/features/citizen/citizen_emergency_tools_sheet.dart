import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models/incident_models.dart';
import '../../data/repository/citizen_repository.dart';
import 'citizen_cubit.dart';
import '../../services/socket_service.dart';

void showCitizenEmergencyToolsSheet({
  required BuildContext context,
  required CitizenRepository repository,
  required CachedIncidentRecord? incident,
  required int initialTabIndex,
}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => CitizenEmergencyToolsSheet(
      repository: repository,
      incident: incident,
      initialTabIndex: initialTabIndex,
    ),
  );
}

class CitizenEmergencyToolsSheet extends StatefulWidget {
  const CitizenEmergencyToolsSheet({
    super.key,
    required this.repository,
    required this.incident,
    required this.initialTabIndex,
  });

  final CitizenRepository repository;
  final CachedIncidentRecord? incident;
  final int initialTabIndex;

  @override
  State<CitizenEmergencyToolsSheet> createState() =>
      _CitizenEmergencyToolsSheetState();
}

class _CitizenEmergencyToolsSheetState extends State<CitizenEmergencyToolsSheet>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final ScrollController _messageScrollController = ScrollController();
  final TextEditingController _messageController = TextEditingController();
  final SocketService _socketService = SocketService();
  StreamSubscription? _messageSubscription;
  StreamSubscription? _incidentSubscription;

  bool _loading = true;
  bool _sending = false;
  String? _error;
  Map<String, dynamic>? _incidentDetails;
  List<Map<String, dynamic>> _messages = const [];

  static const List<_GuideSection> _firstAidGuides = [
    _GuideSection(
      title: "Adult CPR",
      icon: Icons.favorite_border,
      steps: [
        "Push hard and fast on the center of the chest.",
        "Keep the rhythm at 100 to 120 compressions per minute.",
        "Allow the chest to fully recoil between compressions.",
      ],
    ),
    _GuideSection(
      title: "Severe Bleeding",
      icon: Icons.water_drop_outlined,
      steps: [
        "Apply firm, direct pressure to the wound.",
        "Use a clean cloth or bandage if available.",
        "Do not remove soaked cloth; add more layers instead.",
      ],
    ),
    _GuideSection(
      title: "Burns",
      icon: Icons.local_fire_department_outlined,
      steps: [
        "Cool the burn with clean running water.",
        "Do not use ice, butter, or ointments.",
        "Cover lightly with a clean, loose dressing.",
      ],
    ),
    _GuideSection(
      title: "Choking",
      icon: Icons.air_outlined,
      steps: [
        "Stand behind the person and support them.",
        "Give 5 quick abdominal thrusts.",
        "Repeat until the object is removed or help arrives.",
      ],
    ),
    _GuideSection(
      title: "Poisoning",
      icon: Icons.warning_amber_outlined,
      steps: [
        "Move away from the source of exposure.",
        "Do not induce vomiting unless instructed.",
        "Call emergency services and keep the container if safe.",
      ],
    ),
  ];

  String? get _incidentId =>
      widget.incident?.serverIncidentId.isNotEmpty == true
      ? widget.incident!.serverIncidentId
      : null;

  bool get _hasIncident => _incidentId != null;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 4,
      vsync: this,
      initialIndex: widget.initialTabIndex.clamp(0, 3),
    );
    _tabController.addListener(() {
      if (!mounted) return;
      setState(() {});
    });
    _loadIncidentState();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _messageScrollController.dispose();
    _messageController.dispose();
    _messageSubscription?.cancel();
    _incidentSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadIncidentState() async {
    final incidentId = _incidentId;
    if (incidentId == null) {
      if (!mounted) return;
      setState(() => _loading = false);
      return;
    }

    try {
      final fetchedIncident = await widget.repository.fetchIncidentDetails(
        incidentId,
      );
      final messages = await widget.repository.fetchIncidentMessages(
        incidentId,
      );

      if (!mounted) return;
      setState(() {
        _incidentDetails = fetchedIncident;
        _messages = _dedupeMessages(messages);
        _loading = false;
        _error = null;
      });

      await _socketService.connect();
      _socketService.joinIncidentRoom(incidentId);
      _bindLiveUpdates(incidentId);
      _scrollMessagesToBottom();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = "Unable to load live incident data.";
      });
    }
  }

  void _bindLiveUpdates(String incidentId) {
    _messageSubscription ??= _socketService.messageStream.listen((message) {
      final messageIncidentId = _readIncidentId(message);
      if (messageIncidentId != incidentId) return;

      final nextMessages = _dedupeMessages([
        ..._messages,
        Map<String, dynamic>.from(message),
      ]);

      if (!mounted) return;
      setState(() => _messages = nextMessages);
      _scrollMessagesToBottom();
    });

    _incidentSubscription ??= _socketService.incidentStream.listen((event) {
      final data = event['data'];
      if (data is! Map) return;
      final incident = Map<String, dynamic>.from(data);

      if (!mounted) return;
      setState(() => _incidentDetails = incident);
      context.read<CitizenCubit>().refreshCurrentIncidentFromServer();
    });
  }

  Future<void> _sendMessage() async {
    final incidentId = _incidentId;
    if (incidentId == null) return;

    final text = _messageController.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() => _sending = true);
    try {
      final response = await widget.repository.sendIncidentMessage(
        incidentId: incidentId,
        message: text,
      );
      if (!mounted) return;

      final nextMessages = _dedupeMessages([..._messages, response]);

      setState(() {
        _messages = nextMessages;
        _messageController.clear();
      });
      _scrollMessagesToBottom();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Could not send chat message.")),
      );
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  Future<void> _launchVideoRoom() async {
    final incidentId = _incidentId;
    if (incidentId == null) return;

    final roomName = Uri.encodeComponent("quickreach-incident-$incidentId");
    final displayName = Uri.encodeComponent("QuickReach Citizen");
    final url = Uri.parse(
      "https://meet.jit.si/$roomName#userInfo.displayName=%22$displayName%22&config.prejoinPageEnabled=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false",
    );

    final launched = await launchUrl(url, mode: LaunchMode.externalApplication);

    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Unable to open the video room.")),
      );
    }
  }

  Future<void> _callEmergencyLine() async {
    final launched = await launchUrl(
      Uri.parse("tel:911"),
      mode: LaunchMode.externalApplication,
    );
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Unable to open the phone dialer.")),
      );
    }
  }

  void _scrollMessagesToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_messageScrollController.hasClients) return;
      _messageScrollController.animateTo(
        _messageScrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  List<Map<String, dynamic>> _dedupeMessages(List<Map<String, dynamic>> items) {
    final seen = <String>{};
    final result = <Map<String, dynamic>>[];

    for (final item in items) {
      final key = _messageKey(item);
      if (seen.contains(key)) continue;
      seen.add(key);
      result.add(item);
    }

    result.sort((a, b) {
      final left = _parseDate(a['created_at']).millisecondsSinceEpoch;
      final right = _parseDate(b['created_at']).millisecondsSinceEpoch;
      return left.compareTo(right);
    });

    return result;
  }

  String _messageKey(Map<String, dynamic> item) {
    final id = item['_id'] ?? item['id'];
    if (id != null) return id.toString();
    return '${item['sender'] ?? ''}:${item['message'] ?? ''}:${item['created_at'] ?? ''}';
  }

  String? _readIncidentId(Map<String, dynamic> payload) {
    final value = payload['incident_id'] ?? payload['incidentId'];
    return value?.toString();
  }

  DateTime _parseDate(dynamic value) {
    if (value is DateTime) return value;
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value) ?? DateTime.now();
    }
    return DateTime.now();
  }

  String _formatDate(dynamic value) {
    final date = _parseDate(value).toLocal();
    final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    final suffix = date.hour >= 12 ? 'PM' : 'AM';
    return '${date.month}/${date.day} $hour:$minute $suffix';
  }

  List<_TimelineEntry> _buildTimeline() {
    final incident = _incidentDetails;
    final status = (incident?['status']?.toString() ?? 'Pending').toLowerCase();
    final assignedName = incident?['assigned_volunteer_name']?.toString();
    final etaMinutes = incident?['eta_minutes']?.toString();

    final reportedAt = _parseDate(incident?['created_at']);
    final assignedAt = _parseDate(incident?['assigned_at']);
    final updatedAt = _parseDate(incident?['updated_at']);

    return [
      _TimelineEntry(
        title: 'SOS Alert',
        detail: 'Request received and queued for dispatch.',
        time: reportedAt,
        state: _stepState(status, 0),
      ),
      _TimelineEntry(
        title: 'Dispatched',
        detail: assignedName == null || assignedName.isEmpty
            ? 'Awaiting responder assignment.'
            : 'Assigned to $assignedName.',
        time: assignedAt,
        state: _stepState(status, 1),
      ),
      _TimelineEntry(
        title: 'En Route',
        detail: etaMinutes == null || etaMinutes.isEmpty
            ? 'Responder en route or close by.'
            : 'ETA about $etaMinutes minutes.',
        time: updatedAt,
        state: _stepState(status, 2),
      ),
      _TimelineEntry(
        title: 'Resolved',
        detail: 'Incident closed by the dispatch team.',
        time: updatedAt,
        state: _stepState(status, 3),
      ),
    ];
  }

  _StepState _stepState(String status, int index) {
    final resolved = status == 'resolved';
    final dispatched = status == 'dispatched' || resolved;

    switch (index) {
      case 0:
        return _StepState.completed;
      case 1:
        if (dispatched) return _StepState.completed;
        return _StepState.pending;
      case 2:
        if (resolved) return _StepState.completed;
        if (dispatched) return _StepState.active;
        return _StepState.pending;
      case 3:
        if (resolved) return _StepState.completed;
        return _StepState.pending;
      default:
        return _StepState.pending;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      minChildSize: 0.58,
      maxChildSize: 0.96,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF020617),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 14, 18, 12),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.emergency_outlined,
                        color: Colors.redAccent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Emergency Tools',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            _hasIncident
                                ? 'Live chat, progress, first aid, and video support.'
                                : 'First aid is always available. Chat and timeline appear after a synced incident.',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.62),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close, color: Colors.white70),
                    ),
                  ],
                ),
              ),
              TabBar(
                controller: _tabController,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white54,
                indicatorColor: Colors.redAccent,
                indicatorWeight: 3,
                tabs: const [
                  Tab(text: 'Video SOS'),
                  Tab(text: 'Chat'),
                  Tab(text: 'Timeline'),
                  Tab(text: 'First Aid'),
                ],
              ),
              Expanded(
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: Colors.redAccent,
                        ),
                      )
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildVideoTab(),
                          _buildChatTab(),
                          _buildTimelineTab(),
                          _buildFirstAidTab(),
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildChatTab() {
    if (!_hasIncident) {
      return _NoIncidentState(
        icon: Icons.chat_bubble_outline,
        title: 'No synced incident yet',
        message:
            'Start an SOS first. When the incident reaches the server, the live chat will appear here.',
      );
    }

    return Column(
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
            child: _NoticeBanner(text: _error!),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 8),
          child: _IncidentSummaryCard(incident: _incidentDetails),
        ),
        Expanded(
          child: ListView.separated(
            controller: _messageScrollController,
            padding: const EdgeInsets.fromLTRB(18, 8, 18, 12),
            itemCount: _messages.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final message = _messages[index];
              return _ChatBubble(message: message);
            },
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    minLines: 1,
                    maxLines: 4,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Type a message to dispatch...',
                      hintStyle: const TextStyle(color: Colors.white38),
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
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: _sending ? null : _sendMessage,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.redAccent,
                    minimumSize: const Size(54, 54),
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineTab() {
    if (!_hasIncident) {
      return _NoIncidentState(
        icon: Icons.timeline,
        title: 'No synced incident yet',
        message:
            'The incident timeline appears once the SOS is created on the server.',
      );
    }

    final incident = _incidentDetails;
    final status = (incident?['status']?.toString() ?? 'Pending');
    final responder = incident?['assigned_volunteer_name']?.toString();
    final eta = incident?['eta_minutes']?.toString();

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
      children: [
        _IncidentSummaryCard(incident: _incidentDetails),
        const SizedBox(height: 12),
        _StatusCard(status: status, responder: responder, eta: eta),
        const SizedBox(height: 14),
        ..._buildTimeline().map(
          (entry) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _TimelineCard(entry: entry),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Activity Log',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 10),
        if (_messages.isEmpty)
          Text(
            'No chat activity yet.',
            style: TextStyle(color: Colors.white.withOpacity(0.6)),
          )
        else
          ..._messages
              .take(8)
              .map(
                (message) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _ActivityCard(message: message),
                ),
              ),
      ],
    );
  }

  Widget _buildFirstAidTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
      children: [
        const _FirstAidHeader(),
        const SizedBox(height: 12),
        ..._firstAidGuides.map(
          (guide) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _FirstAidCard(guide: guide),
          ),
        ),
      ],
    );
  }

  Widget _buildVideoTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
      children: [
        _VideoRoomCard(
          incidentId: _incidentId,
          incident: _incidentDetails,
          onLaunch: _hasIncident ? _launchVideoRoom : null,
          onCallEmergencyLine: _callEmergencyLine,
        ),
        const SizedBox(height: 14),
        _NoticeBanner(
          text:
              'Video SOS opens a secure room in the browser so dispatch can see what is happening in real time.',
        ),
      ],
    );
  }
}

class _IncidentSummaryCard extends StatelessWidget {
  const _IncidentSummaryCard({required this.incident});

  final Map<String, dynamic>? incident;

  @override
  Widget build(BuildContext context) {
    final type = incident?['type']?.toString() ?? 'Medical';
    final status = incident?['status']?.toString() ?? 'Pending';
    final responder = incident?['assigned_volunteer_name']?.toString();
    final eta = incident?['eta_minutes']?.toString();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$type SOS',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _StatusPill(label: status),
              if (responder != null && responder.isNotEmpty)
                _StatusPill(label: responder),
              if (eta != null && eta.isNotEmpty)
                _StatusPill(label: 'ETA $eta mins'),
            ],
          ),
        ],
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message});

  final Map<String, dynamic> message;

  @override
  Widget build(BuildContext context) {
    final sender = message['sender']?.toString() ?? 'citizen';
    final text = message['message']?.toString() ?? '';
    final createdAt = message['created_at'];
    final isCitizen = sender == 'citizen';
    final label = switch (sender) {
      'dispatcher' => 'Dispatch',
      'volunteer' => 'Responder',
      _ => 'You',
    };

    return Align(
      alignment: isCitizen ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isCitizen ? Colors.redAccent : const Color(0xFF111827),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isCitizen
                  ? Colors.redAccent
                  : Colors.white.withOpacity(0.08),
            ),
          ),
          child: Column(
            crossAxisAlignment: isCitizen
                ? CrossAxisAlignment.end
                : CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.75),
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                text,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _formatTime(createdAt),
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(dynamic value) {
    if (value is! String) return '';
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return '';
    final local = parsed.toLocal();
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final suffix = local.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $suffix';
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.status,
    required this.responder,
    required this.eta,
  });

  final String status;
  final String? responder;
  final String? eta;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Responder Status',
            style: TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          _StatusPill(label: status),
          const SizedBox(height: 10),
          Text(
            responder != null && responder!.isNotEmpty
                ? 'Assigned to $responder'
                : 'Awaiting responder assignment.',
            style: TextStyle(color: Colors.white.withOpacity(0.75)),
          ),
          if (eta != null && eta!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'ETA about $eta minutes',
              style: const TextStyle(
                color: Colors.redAccent,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.entry});

  final _TimelineEntry entry;

  @override
  Widget build(BuildContext context) {
    final color = switch (entry.state) {
      _StepState.completed => Colors.greenAccent,
      _StepState.active => Colors.redAccent,
      _StepState.pending => Colors.white30,
    };

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  entry.detail,
                  style: TextStyle(color: Colors.white.withOpacity(0.72)),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatDate(entry.time),
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.45),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final local = date.toLocal();
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final suffix = local.hour >= 12 ? 'PM' : 'AM';
    return '${local.month}/${local.day} $hour:$minute $suffix';
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.message});

  final Map<String, dynamic> message;

  @override
  Widget build(BuildContext context) {
    final sender = message['sender']?.toString() ?? 'citizen';
    final text = message['message']?.toString() ?? '';
    final time = message['created_at']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            sender == 'citizen'
                ? 'Citizen update'
                : sender == 'dispatcher'
                ? 'Dispatcher update'
                : 'Responder update',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(text, style: TextStyle(color: Colors.white.withOpacity(0.78))),
          if (time.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              time,
              style: TextStyle(
                color: Colors.white.withOpacity(0.45),
                fontSize: 11,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _FirstAidHeader extends StatelessWidget {
  const _FirstAidHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Text(
        'Quick reference while you wait for help. Follow dispatcher instructions first if they conflict with these steps.',
        style: TextStyle(color: Colors.white.withOpacity(0.78), height: 1.45),
      ),
    );
  }
}

class _FirstAidCard extends StatelessWidget {
  const _FirstAidCard({required this.guide});

  final _GuideSection guide;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(guide.icon, color: Colors.redAccent, size: 20),
              const SizedBox(width: 10),
              Text(
                guide.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...guide.steps.map(
            (step) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    margin: const EdgeInsets.only(top: 7),
                    decoration: const BoxDecoration(
                      color: Colors.redAccent,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      step,
                      style: TextStyle(color: Colors.white.withOpacity(0.76)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VideoRoomCard extends StatelessWidget {
  const _VideoRoomCard({
    required this.incidentId,
    required this.incident,
    required this.onLaunch,
    required this.onCallEmergencyLine,
  });

  final String? incidentId;
  final Map<String, dynamic>? incident;
  final VoidCallback? onLaunch;
  final VoidCallback onCallEmergencyLine;

  @override
  Widget build(BuildContext context) {
    final title = incidentId == null
        ? 'No active video room yet'
        : 'Room: quickreach-incident-$incidentId';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Video SOS',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(title, style: TextStyle(color: Colors.white.withOpacity(0.72))),
          const SizedBox(height: 8),
          Text(
            'Open a live video room for face-to-face assistance with dispatch.',
            style: TextStyle(
              color: Colors.white.withOpacity(0.55),
              height: 1.45,
            ),
          ),
          if (incident != null) ...[
            const SizedBox(height: 10),
            Text(
              'Incident: ${incident!['type'] ?? 'Medical'} • ${incident!['status'] ?? 'Pending'}',
              style: const TextStyle(
                color: Colors.redAccent,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: onLaunch,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.redAccent,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  icon: const Icon(Icons.videocam_outlined),
                  label: const Text('Open Video Room'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onCallEmergencyLine,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: BorderSide(color: Colors.white.withOpacity(0.18)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  icon: const Icon(Icons.phone_in_talk_outlined),
                  label: const Text('Call 911'),
                ),
              ),
            ],
          ),
          if (onLaunch == null) ...[
            const SizedBox(height: 12),
            Text(
              'A synced incident is required before the video room can be opened.',
              style: TextStyle(color: Colors.white.withOpacity(0.5)),
            ),
          ],
        ],
      ),
    );
  }
}

class _NoticeBanner extends StatelessWidget {
  const _NoticeBanner({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF3B1D1D),
        borderRadius: BorderRadius.circular(16),
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

class _NoIncidentState extends StatelessWidget {
  const _NoIncidentState({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.redAccent, size: 40),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.redAccent.withOpacity(0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.redAccent.withOpacity(0.22)),
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

class _GuideSection {
  const _GuideSection({
    required this.title,
    required this.icon,
    required this.steps,
  });

  final String title;
  final IconData icon;
  final List<String> steps;
}

class _TimelineEntry {
  const _TimelineEntry({
    required this.title,
    required this.detail,
    required this.time,
    required this.state,
  });

  final String title;
  final String detail;
  final DateTime time;
  final _StepState state;
}

enum _StepState { completed, active, pending }
