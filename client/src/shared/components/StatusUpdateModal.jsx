import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Send, AlertCircle } from 'lucide-react';
import Button from './Button';
import TextArea from './TextArea';
import Select from './Select';
import { useToast } from './toast/ToastProvider';

const StatusUpdateModal = ({ isOpen, onClose, onUpdate, currentStatus, applicantName }) => {
  const toast = useToast();
  const [status, setStatus] = useState(currentStatus || 'reviewed');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onUpdate(status, comment);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update status.");
      toast.error(err.message || "Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'rejected', label: 'Rejected' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Update Status</h3>
            <p className="text-sm text-slate-400 mt-1">For {applicantName}</p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">
              New Status
            </label>
            <Select
              id="status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={statusOptions}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">
              Feedback Comment
            </label>
            <TextArea
              id="status-comment"
              placeholder="e.g. Portfolio looks great, let's chat next week!"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            <p className="text-[11px] text-slate-500 ml-1">
              This comment will be visible to the student in their application timeline.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={onClose}
              disabled={loading}
              className="border-white/10 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              loading={loading}
              className="bg-blue-600 hover:bg-blue-500"
              leftIcon={<Send size={18} />}
            >
              Update Status
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

StatusUpdateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  currentStatus: PropTypes.string,
  applicantName: PropTypes.string,
};

export default StatusUpdateModal;
