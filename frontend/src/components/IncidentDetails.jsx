import React from 'react';
import { X, MapPin, Clock, AlertTriangle, Phone, Navigation } from 'lucide-react';
import { cn } from '../lib/utils';

export const IncidentDetails = ({ incident, isOpen, onClose, onNavigate, onAccept }) => {
  if (!isOpen || !incident) return null;

  const createdAt = new Date(incident.created_at);
  const timeAgo = Math.floor((new Date() - createdAt) / 1000 / 60);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl",
              incident.type === 'Fire' ? 'bg-orange-600' : 'bg-red-600'
            )}>
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{incident.type} Emergency</h2>
              <p className="text-sm text-slate-400">Incident #{incident.id.slice(0, 8)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider",
              incident.status === 'Pending' 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            )}>
              {incident.status}
            </span>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-bold">
                {timeAgo < 1 ? 'Just now' : `${timeAgo} min ago`}
              </span>
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white">Location Details</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Coordinates:</span>
                <span className="text-white font-mono text-sm break-all text-right">
                  {incident.lat.toFixed(6)}, {incident.lng.toFixed(6)}
                </span>
              </div>
              {incident.distance && (
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Distance:</span>
                  <span className="text-blue-400 font-bold text-sm">
                    {incident.distance.toFixed(1)} km away
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Reporter Info */}
          <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-green-400" />
              <h3 className="font-bold text-white">Reporter Information</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Contact:</span>
                <span className="text-white font-bold text-sm">{incident.reporter_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Reported:</span>
                <span className="text-white text-sm">{createdAt.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Emergency Type Info */}
          <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-2xl p-4">
            <h3 className="font-bold text-white mb-2">Emergency Type: {incident.type}</h3>
            <p className="text-red-200 text-sm">
              {incident.type === 'Fire' 
                ? 'Fire emergency requires immediate attention. Ensure your safety first before responding.'
                : 'Medical emergency requires first aid assistance. Bring necessary medical supplies if available.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-white/10 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all"
          >
            Close
          </button>
          <button
            onClick={() => onNavigate(incident.lat, incident.lng)}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-5 h-5" />
            Navigate
          </button>
          {incident.status === 'Pending' && onAccept && (
            <button
              onClick={() => onAccept(incident)}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/50"
            >
              Accept & Respond
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
