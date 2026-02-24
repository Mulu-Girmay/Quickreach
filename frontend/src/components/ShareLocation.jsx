import React, { useState } from 'react';
import { Share2, X, UserPlus, Send, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export const ShareLocation = ({ location, incidentId, isOpen, onClose }) => {
  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('emergency_contacts');
    return saved ? JSON.parse(saved) : [];
  });
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [sentTo, setSentTo] = useState([]);

  const saveContacts = (updated) => {
    localStorage.setItem('emergency_contacts', JSON.stringify(updated));
    setContacts(updated);
  };

  const addContact = () => {
    if (!newContact.name || !newContact.phone) return;
    const updated = [...contacts, { ...newContact, id: Date.now() }];
    saveContacts(updated);
    setNewContact({ name: '', phone: '' });
  };

  const removeContact = (id) => {
    saveContacts(contacts.filter(c => c.id !== id));
  };

  const shareWithContact = async (contact) => {
    const mapUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    const message = `🚨 EMERGENCY ALERT 🚨\n\nI need help! My current location:\n${mapUrl}\n\nIncident ID: ${incidentId?.slice(0, 8)}\n\nThis is an automated message from QuickReach Emergency System.`;
    
    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Emergency Location',
          text: message
        });
        setSentTo([...sentTo, contact.id]);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(message);
      alert(`Location copied! Send to ${contact.name} at ${contact.phone}`);
      setSentTo([...sentTo, contact.id]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Share Location</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Contact Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Emergency Contact
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={addContact}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors"
              >
                Add Contact
              </button>
            </div>
          </div>

          {/* Contacts List */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3">Emergency Contacts</h3>
            {contacts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No contacts added yet</p>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{contact.name}</p>
                      <p className="text-sm text-slate-500">{contact.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sentTo.includes(contact.id) ? (
                        <div className="bg-green-100 text-green-600 px-3 py-1 rounded-lg flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          <span className="text-xs font-bold">Sent</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => shareWithContact(contact)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          <span className="text-xs font-bold">Share</span>
                        </button>
                      )}
                      <button
                        onClick={() => removeContact(contact.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
