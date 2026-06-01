import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, Sparkles, Award, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLUMNS = [
  { id: 'pending', title: 'Pending', color: 'border-yellow-500/30 bg-yellow-500/5', header: 'bg-yellow-500/10 text-yellow-500' },
  { id: 'reviewed', title: 'Reviewed', color: 'border-blue-500/30 bg-blue-500/5', header: 'bg-blue-500/10 text-blue-500' },
  { id: 'shortlisted', title: 'Shortlisted', color: 'border-emerald-500/30 bg-emerald-500/5', header: 'bg-emerald-500/10 text-emerald-500' },
  { id: 'rejected', title: 'Rejected', color: 'border-red-500/30 bg-red-500/5', header: 'bg-red-500/10 text-red-500' },
];

const SortableAppCard = ({ app, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const getSignalIcon = (signal) => {
    if (signal.includes("Fast-Track") || signal.includes("Strong")) return <Sparkles size={12} className="mr-1 inline text-purple-400" />;
    if (signal.includes("Required") || signal.includes("Needed")) return <AlertTriangle size={12} className="mr-1 inline text-amber-400" />;
    return <Award size={12} className="mr-1 inline text-blue-400" />;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(app)}
      className={`p-4 mb-3 rounded-xl border bg-[var(--surface)] shadow-md cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${
        isDragging ? 'border-primary ring-2 ring-primary/20' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[var(--surface-soft)] flex items-center justify-center text-[var(--primary)] font-bold border border-[var(--border)] overflow-hidden flex-shrink-0">
          {app.applicant?.profilePic ? (
            <img src={app.applicant.profilePic} alt={app.applicant.name} className="w-full h-full object-cover" />
          ) : (
            app.applicant?.name?.charAt(0)?.toUpperCase() || <User size={16} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm truncate text-[var(--text-main)]">{app.applicant?.name}</h4>
          <p className="text-xs text-[var(--text-muted)] truncate">{app.applicant?.email}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1 bg-[var(--surface-soft)] rounded border border-[var(--border)]/50 p-1.5 text-center">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Match</p>
          <p className={`text-xs font-black ${app.aiMatchScore >= 80 ? 'text-emerald-400' : app.aiMatchScore >= 60 ? 'text-blue-400' : 'text-amber-400'}`}>
            {app.aiMatchScore ? `${app.aiMatchScore}%` : 'N/A'}
          </p>
        </div>
        <div className="flex-1 bg-[var(--surface-soft)] rounded border border-[var(--border)]/50 p-1.5 text-center">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">ATS</p>
          <p className="text-xs font-bold text-[var(--text-main)]">
            {app.matchBreakdown?.atsCompatibility ? `${app.matchBreakdown.atsCompatibility}%` : 'N/A'}
          </p>
        </div>
      </div>

      {app.aiHiringSignals && app.aiHiringSignals.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-main)] truncate">
          {getSignalIcon(app.aiHiringSignals[0])}
          <span className="truncate">{app.aiHiringSignals[0]}</span>
        </div>
      )}
    </div>
  );
};

const Column = ({ id, title, color, header, items, onCardClick }) => {
  return (
    <div className={`flex flex-col w-[300px] flex-shrink-0 rounded-2xl border ${color} overflow-hidden h-[calc(100vh-280px)] min-h-[500px]`}>
      <div className={`px-4 py-3 font-bold flex justify-between items-center ${header} border-b border-inherit`}>
        <span>{title}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <SortableContext items={items.map((i) => i._id)} strategy={verticalListSortingStrategy}>
          {items.map((app) => (
            <SortableAppCard key={app._id} app={app} onClick={onCardClick} />
          ))}
          {items.length === 0 && (
            <div className="h-24 flex items-center justify-center text-xs font-medium text-[var(--text-muted)] opacity-50 border-2 border-dashed border-[var(--border)] rounded-xl">
              Drop candidates here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};

const ApplicantsKanbanBoard = ({ applications, onStatusChange, onAppClick }) => {
  const [columns, setColumns] = useState({
    pending: [],
    reviewed: [],
    shortlisted: [],
    rejected: []
  });

  // Distribute apps into columns
  useEffect(() => {
    const newCols = { pending: [], reviewed: [], shortlisted: [], rejected: [] };
    applications.forEach(app => {
      // Avoid withdrawn apps on the board or place them in rejected
      if (app.status === 'withdrawn') return; 
      if (newCols[app.status]) {
        newCols[app.status].push(app);
      } else {
        newCols.pending.push(app); // fallback
      }
    });
    setColumns(newCols);
  }, [applications]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 5px drag distance before activating
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    // Find the source column and item
    let sourceColId = null;
    let destColId = null;

    Object.keys(columns).forEach((key) => {
      if (columns[key].find(item => item._id === active.id)) sourceColId = key;
      // If over is a column ID directly (droppable container)
      if (key === over.id) destColId = key;
      // If over is an item inside a column
      if (columns[key].find(item => item._id === over.id)) destColId = key;
    });

    if (!sourceColId || !destColId || sourceColId === destColId) return;

    // Optimistic UI update
    const sourceItems = [...columns[sourceColId]];
    const destItems = [...columns[destColId]];
    
    const activeItemIndex = sourceItems.findIndex(i => i._id === active.id);
    const [movedItem] = sourceItems.splice(activeItemIndex, 1);
    
    // Add to destination
    destItems.push({ ...movedItem, status: destColId });
    
    setColumns({
      ...columns,
      [sourceColId]: sourceItems,
      [destColId]: destItems
    });

    // Fire backend update
    onStatusChange(active.id, destColId);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin w-full">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            header={col.header}
            items={columns[col.id]}
            onCardClick={onAppClick}
          />
        ))}
      </DndContext>
    </div>
  );
};

export default ApplicantsKanbanBoard;
