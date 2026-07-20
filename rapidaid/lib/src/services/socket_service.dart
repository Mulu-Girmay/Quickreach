// lib/services/socket_service.dart
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  String? _currentIncidentId;
  String? _currentRole;

  final _connectionController = StreamController<bool>.broadcast();
  final _incidentController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  final _volunteerController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<bool> get connectionStream => _connectionController.stream;
  Stream<Map<String, dynamic>> get incidentStream => _incidentController.stream;
  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  Stream<Map<String, dynamic>> get volunteerStream =>
      _volunteerController.stream;

  bool get isConnected => _isConnected;
  String? get currentIncidentId => _currentIncidentId;

  Future<void> connect() async {
    if (_socket != null && _isConnected) {
      print('🔌 Socket already connected');
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('quickreach_auth_token');
      _currentRole = prefs.getString('user_role') ?? 'citizen';
      _currentIncidentId = prefs.getString('active_incident_id');

      final apiUrl = const String.fromEnvironment(
        'QUICKREACH_API_URL',
        defaultValue: 'http://10.0.2.2:3000',
      );

      print('🔌 Connecting to socket at: $apiUrl');
      print('👤 Role: $_currentRole');
      print('🆔 Incident: $_currentIncidentId');

      _socket = IO.io(
        apiUrl,
        IO.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .setPath('/socket.io')
            .enableAutoConnect()
            .setExtraHeaders({'Authorization': 'Bearer $token'})
            .build(),
      );

      _socket!.onConnect((_) {
        print('✅ Socket connected');
        _isConnected = true;
        _connectionController.add(true);

        // Join appropriate rooms based on role
        _joinRooms();
      });

      _socket!.onConnectError((error) {
        print('❌ Socket connection error: $error');
        _isConnected = false;
        _connectionController.add(false);
      });

      _socket!.onDisconnect((_) {
        print('🔌 Socket disconnected');
        _isConnected = false;
        _connectionController.add(false);
      });

      _socket!.on('new-incident', (data) {
        print('📢 New incident received: $data');
        _incidentController.add({'type': 'new', 'data': data});
      });

      _socket!.on('incident-updated', (data) {
        print('🔄 Incident updated: $data');
        _incidentController.add({'type': 'updated', 'data': data});
      });

      // Listen for specific incident updates if we have an incident ID
      if (_currentIncidentId != null && _currentIncidentId!.isNotEmpty) {
        _socket!.on('incident-${_currentIncidentId}', (data) {
          print('📌 Specific incident update: $data');
          _incidentController.add({'type': 'specific', 'data': data});
        });

        _socket!.on('message-${_currentIncidentId}', (data) {
          print('💬 New incident message: $data');
          _messageController.add(data);
        });
      }

      _socket!.on('message', (data) {
        print('💬 New message: $data');
        _messageController.add(data);
      });

      _socket!.on('volunteer-updated', (data) {
        print('🚑 Volunteer updated: $data');
        _volunteerController.add(data);
      });

      _socket!.connect();
    } catch (e) {
      print('❌ Socket connection failed: $e');
      _isConnected = false;
      _connectionController.add(false);
    }
  }

  void _joinRooms() {
    // Join team room based on role
    if (_currentRole == 'dispatcher' || _currentRole == 'admin') {
      _socket?.emit('join-team', {'role': 'dispatcher'});
      print('👤 Joined dispatcher room');
    } else if (_currentRole == 'volunteer') {
      _socket?.emit('join-team', {'role': 'volunteer'});
      print('👤 Joined volunteer room');
    }

    // Join incident room if citizen has an active incident
    if (_currentIncidentId != null &&
        _currentIncidentId!.isNotEmpty &&
        _currentRole == 'citizen') {
      _socket?.emit('join-incident', {'incident_id': _currentIncidentId});
      print('👤 Joined incident room: $_currentIncidentId');
    }
  }

  void joinIncidentRoom(String incidentId) async {
    _currentIncidentId = incidentId;
    if (_socket != null && _isConnected) {
      _socket!.emit('join-incident', {'incident_id': incidentId});

      // Set up listeners for this incident
      _socket!.on('incident-$incidentId', (data) {
        print('📌 Specific incident update: $data');
        _incidentController.add({'type': 'specific', 'data': data});
      });

      _socket!.on('message-$incidentId', (data) {
        print('💬 New incident message: $data');
        _messageController.add(data);
      });

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('active_incident_id', incidentId);
      print('👤 Joined incident room: $incidentId');
    }
  }

  void leaveIncidentRoom(String incidentId) async {
    if (_socket != null && _isConnected) {
      _socket!.emit('leave-incident', {'incident_id': incidentId});

      // Remove listeners for this incident
      _socket!.off('incident-$incidentId');
      _socket!.off('message-$incidentId');

      _currentIncidentId = null;
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('active_incident_id');
      print('👤 Left incident room: $incidentId');
    }
  }

  void sendMessage(Map<String, dynamic> message) {
    if (_socket != null && _isConnected) {
      _socket!.emit('send-message', message);
      print('💬 Message sent: $message');
    } else {
      print('⚠️ Cannot send message: Socket not connected');
    }
  }

  void sendIncidentMessage(String incidentId, String message, String sender) {
    if (_socket != null && _isConnected) {
      final messageData = {
        'incident_id': incidentId,
        'message': message,
        'sender': sender,
        'timestamp': DateTime.now().toIso8601String(),
      };
      _socket!.emit('send-message', messageData);
      print('💬 Incident message sent: $messageData');
    } else {
      print('⚠️ Cannot send message: Socket not connected');
    }
  }

  void updateLocation(Map<String, double> location) {
    if (_socket != null && _isConnected) {
      _socket!.emit('update-location', location);
      print('📍 Location updated: $location');
    }
  }

  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
      _isConnected = false;
      _connectionController.add(false);
      print('🔌 Socket disconnected manually');
    }
  }

  void dispose() {
    disconnect();
    _connectionController.close();
    _incidentController.close();
    _messageController.close();
    _volunteerController.close();
  }
}
