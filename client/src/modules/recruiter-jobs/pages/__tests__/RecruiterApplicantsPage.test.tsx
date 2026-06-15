// @ts-nocheck

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecruiterApplicantsPage, { filterApplicants } from '../RecruiterApplicantsPage';
import * as jobPostingService from '../../services/jobPostingService';

vi.mock('../../services/jobPostingService', () => ({
  getJobApplications: vi.fn(),
  getJobPostingById: vi.fn(),
  updateApplicationStatus: vi.fn(),
  exportJobApplicationsCSV: vi.fn(),
}));

vi.mock('../../../../shared/components/Navbar', () => ({
  default: () => <nav data-testid="navbar" />,
}));

vi.mock('../../../../shared/components/Footer', () => ({
  default: () => <footer data-testid="footer" />,
}));

vi.mock('../../../../hooks/useDocumentTitle', () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock('../../../../shared/components/toast/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../components/ApplicantsKanbanBoard', () => ({
  default: ({ applications }) => (
    <div data-testid="kanban-board">
      {applications.map((application) => (
        <span key={application._id}>{application.applicant?.name}</span>
      ))}
    </div>
  ),
}));

vi.mock('../../../../shared/components', () => ({
  Button: ({ children, onClick, className, disabled, type = 'button' }) => (
    <button type={type} onClick={onClick} className={className} disabled={disabled}>
      {children}
    </button>
  ),
  LoadingState: ({ message }) => <div data-testid="loading-state">{message}</div>,
  ErrorState: ({ description, message, onRetry }) => (
    <div data-testid="error-state">
      <span>{description || message}</span>
      <button type="button" onClick={onRetry}>Retry</button>
    </div>
  ),
  EmptyState: ({ title, description, children }) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  ),
  StatusUpdateModal: () => null,
  StatusTimeline: () => <div data-testid="status-timeline" />,
}));

const applicants = [
  {
    _id: 'app-1',
    applicant: { name: 'Asha Patel', email: 'asha@example.com' },
    resume: { skills: ['React', 'Node.js'] },
    status: 'pending',
    aiMatchScore: 92,
    matchCategory: 'Excellent Match',
    matchBreakdown: {
      atsCompatibility: 88,
      contributionActivity: 'High',
      careerReadiness: 'High',
    },
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    _id: 'app-2',
    applicant: { name: 'Rohan Mehta', email: 'rohan@example.com' },
    resume: { skills: ['Python', 'Django'] },
    status: 'reviewed',
    aiMatchScore: 71,
    matchCategory: 'Moderate Match',
    matchBreakdown: {
      atsCompatibility: 64,
      contributionActivity: 'Low',
      careerReadiness: 'Medium',
    },
    createdAt: '2026-05-10T10:00:00.000Z',
  },
];

const createStore = () => configureStore({
  reducer: {
    auth: () => ({ token: 'test-token' }),
  },
});

const renderPage = () => render(
  <Provider store={createStore()}>
    <MemoryRouter initialEntries={['/recruiter/jobs/job-123/applicants']}>
      <Routes>
        <Route path="/recruiter/jobs/:id/applicants" element={<RecruiterApplicantsPage />} />
      </Routes>
    </MemoryRouter>
  </Provider>
);

describe('filterApplicants', () => {
  it('filters by applicant search, status, skill, score, and applied date', () => {
    const result = filterApplicants(applicants, {
      searchTerm: 'asha@',
      statusFilter: 'pending',
      skillsFilter: 'react',
      minScore: 90,
      minAtsScore: 80,
      selectedCategories: ['Excellent Match'],
      contributorOnly: true,
      careerReadiness: 'High',
      appliedFrom: '2026-06-01',
      appliedTo: '2026-06-02',
    });

    expect(result).toEqual([applicants[0]]);
  });

  it('returns no applicants outside the selected date range', () => {
    const result = filterApplicants(applicants, {
      appliedFrom: '2026-06-05',
      appliedTo: '2026-06-10',
    });

    expect(result).toEqual([]);
  });
});

describe('RecruiterApplicantsPage filters', () => {
  beforeEach(() => {
    jobPostingService.getJobPostingById.mockResolvedValue({
      job: { _id: 'job-123', title: 'Frontend Engineer' },
    });
    jobPostingService.getJobApplications.mockResolvedValue({
      applications: applicants,
      totalPages: 1,
      totalCount: applicants.length,
    });
  });

  it('searches applicants by name and email', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Asha Patel')).toBeInTheDocument();
    expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/search applicant/i), { target: { value: 'rohan@' } });
    });

    await waitFor(() => {
      expect(screen.queryByText('Asha Patel')).not.toBeInTheDocument();
      expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
    });
  });

  it('shows an empty state and resets responsive filters', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Asha Patel')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/skills/i), { target: { value: 'kubernetes' } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No Matching Candidates')).toBeInTheDocument();
      expect(screen.getByText(/No applicants match your current filtering criteria/i)).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /clear all filters/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Asha Patel')).toBeInTheDocument();
      expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
      expect(screen.getByLabelText(/skills/i)).toHaveValue('');
    });
  });

  it('sends server-supported filters when controls change', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Asha Patel')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/search applicant/i), { target: { value: 'Asha' } });
      fireEvent.change(screen.getByLabelText(/skills/i), { target: { value: 'React' } });
      fireEvent.change(screen.getByLabelText(/application status/i), { target: { value: 'pending' } });
      fireEvent.change(screen.getByLabelText(/^From$/i), { target: { value: '2026-06-01' } });
      fireEvent.change(screen.getByLabelText(/^To$/i), { target: { value: '2026-06-30' } });
    });

    await waitFor(() => {
      const lastCall = jobPostingService.getJobApplications.mock.calls.at(-1);
      expect(lastCall[0]).toBe('job-123');
      expect(lastCall[1]).toBe('test-token');
      expect(lastCall[2]).toMatchObject({
        q: 'Asha',
        skills: 'React',
        status: 'pending',
        appliedFrom: '2026-06-01',
        appliedTo: '2026-06-30',
      });
    });
  });
});
