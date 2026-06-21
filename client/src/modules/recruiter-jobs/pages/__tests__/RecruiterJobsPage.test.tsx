
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import RecruiterJobsPage from '../RecruiterJobsPage'
import * as jobPostingService from '../../services/jobPostingService'
import { ToastProvider } from '../../../../shared/components/toast/ToastProvider'
import Footer from "../../../../shared/components/Footer";


// Mock the service
vi.mock('../../services/jobPostingService', () => ({
  getRecruiterJobs: vi.fn(),
  deleteJobPosting: vi.fn(),
}))

// Mock components
vi.mock('../../../../shared/components/Navbar', () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}))

vi.mock('../../../../shared/components/Input', () => ({
  default: ({ value, onChange, leftIcon, ...props }) => (
    <input
      type="text"
      value={value}
      onChange={onChange}
      data-testid="search-input"
      {...props}
    />
  ),
}))

vi.mock('../../../../shared/components/LoadingState', () => ({
  default: ({ message }) => <div data-testid="loading-state">{message}</div>,
}))

vi.mock('../../../../shared/components/ErrorState', () => ({
  default: ({ message, onRetry }) => (
    <div data-testid="error-state">
      <span>{message}</span>
      <button onClick={onRetry} data-testid="retry-btn">Retry</button>
    </div>
  ),
}))

vi.mock('../../../../shared/components/EmptyState', () => ({
  default: ({ title, description, action }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  ),
}))

vi.mock('../../../student-jobs/components/JobCardSkeleton', () => ({
  default: () => <div data-testid="job-card-skeleton">Skeleton</div>
}))

vi.mock('../../../../shared/components', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    // @ts-expect-error TODO: Fix pervasive types
    ...actual,
    JobViewerCard: ({ job, viewerRole, onEdit, onDelete, onViewStats, onViewApplicants }) => (
      <div data-testid={`job-card-${job._id || job.id}`}>
        <h4>{job.title}</h4>
        <button onClick={() => onEdit(job)} data-testid={`edit-${job._id || job.id}`}>Edit</button>
        <button onClick={() => onViewStats(job)} data-testid={`stats-${job._id || job.id}`}>Stats</button>
        <button onClick={() => onViewApplicants(job)} data-testid={`applicants-${job._id || job.id}`}>Applicants</button>
        <button onClick={() => onDelete(job)} data-testid={`delete-${job._id || job.id}`}>Delete</button>
            <Footer />
    </div>
    )
  }
})

const createMockStore = (token = 'test-token') => {
  return configureStore({
    reducer: {
      auth: () => ({ token }),
    },
  })
}


const renderWithProviders = (component, { store = createMockStore() } = {}) => {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ToastProvider>
          {component}
        </ToastProvider>
      </MemoryRouter>
    </Provider>
  )
}

describe('RecruiterJobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state while fetching jobs', () => {
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    )

    renderWithProviders(<RecruiterJobsPage />)

    expect(screen.getAllByTestId('job-card-skeleton')).toHaveLength(6)
  })

  it('fetches and displays jobs on mount', async () => {
    const mockJobs = [
      { _id: '1', title: 'Senior Engineer', location: { city: 'Mumbai' }, status: 'open', createdAt: new Date().toISOString() },
      { _id: '2', title: 'Junior Developer', location: { city: 'Delhi' }, status: 'draft', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      expect(jobPostingService.getRecruiterJobs).toHaveBeenCalledWith('test-token', 1, 6)
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('job-card-2')).toBeInTheDocument()
      expect(screen.getByText('Senior Engineer')).toBeInTheDocument()
      expect(screen.getByText('Junior Developer')).toBeInTheDocument()
    })
  })

  it('shows all jobs by default', async () => {
    const mockJobs = [
      { _id: '1', title: 'Open Engineer', location: { city: 'Mumbai' }, status: 'open', createdAt: new Date().toISOString() },
      { _id: '2', title: 'Closed Designer', location: { city: 'Delhi' }, status: 'closed', createdAt: new Date().toISOString() },
      { _id: '3', title: 'Archived Analyst', location: { city: 'Pune' }, status: 'archived', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('job-card-2')).toBeInTheDocument()
      expect(screen.getByTestId('job-card-3')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /all jobs/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('filters jobs by open status', async () => {
    const user = userEvent.setup()
    const mockJobs = [
      { _id: '1', title: 'Open Engineer', location: { city: 'Mumbai' }, status: 'open', createdAt: new Date().toISOString() },
      { _id: '2', title: 'Closed Designer', location: { city: 'Delhi' }, status: 'closed', createdAt: new Date().toISOString() },
      { _id: '3', title: 'Archived Analyst', location: { city: 'Pune' }, status: 'archived', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
    })

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /open/i }))
    })

    expect(screen.getByRole('button', { name: /open/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
    expect(screen.queryByTestId('job-card-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('job-card-3')).not.toBeInTheDocument()
  })

  it('filters jobs by closed status', async () => {
    const user = userEvent.setup()
    const mockJobs = [
      { _id: '1', title: 'Open Engineer', location: { city: 'Mumbai' }, status: 'open', createdAt: new Date().toISOString() },
      { _id: '2', title: 'Closed Designer', location: { city: 'Delhi' }, status: 'closed', createdAt: new Date().toISOString() },
      { _id: '3', title: 'Archived Analyst', location: { city: 'Pune' }, status: 'archived', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('job-card-2')).toBeInTheDocument()
    })

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /closed/i }))
    })

    expect(screen.getByRole('button', { name: /closed/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('job-card-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('job-card-2')).toBeInTheDocument()
    expect(screen.queryByTestId('job-card-3')).not.toBeInTheDocument()
  })

  it('filters jobs by archived status', async () => {
    const user = userEvent.setup()
    const mockJobs = [
      { _id: '1', title: 'Open Engineer', location: { city: 'Mumbai' }, status: 'open', createdAt: new Date().toISOString() },
      { _id: '2', title: 'Closed Designer', location: { city: 'Delhi' }, status: 'closed', createdAt: new Date().toISOString() },
      { _id: '3', title: 'Archived Analyst', location: { city: 'Pune' }, status: 'archived', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('job-card-3')).toBeInTheDocument()
    })

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /archived/i }))
    })

    expect(screen.getByRole('button', { name: /archived/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('job-card-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('job-card-2')).not.toBeInTheDocument()
    expect(screen.getByTestId('job-card-3')).toBeInTheDocument()
  })

  it('shows a status-specific empty state when no jobs match the selected filter', async () => {
    const user = userEvent.setup()
    const mockJobs = [
      { _id: '1', title: 'Open Engineer', location: { city: 'Mumbai' }, status: 'open', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
    })

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /archived/i }))
    })

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No archived jobs found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search or status filter.')).toBeInTheDocument()
  })

  it('updates active filter styling when status filter changes', async () => {
    const user = userEvent.setup()
    const mockJobs = [
      { _id: '1', title: 'Open Engineer', location: { city: 'Mumbai' }, status: 'open', createdAt: new Date().toISOString() },
      { _id: '2', title: 'Closed Designer', location: { city: 'Delhi' }, status: 'closed', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
    })

    const allJobsButton = screen.getByRole('button', { name: /all jobs/i })
    const closedButton = screen.getByRole('button', { name: /closed/i })

    expect(allJobsButton).toHaveAttribute('aria-pressed', 'true')
    expect(allJobsButton.className).toContain('border-blue-400')
    expect(closedButton).toHaveAttribute('aria-pressed', 'false')

    await act(async () => {
      await user.click(closedButton)
    })

    expect(allJobsButton).toHaveAttribute('aria-pressed', 'false')
    expect(closedButton).toHaveAttribute('aria-pressed', 'true')
    expect(closedButton.className).toContain('border-blue-400')
  })

  it('shows empty state when no jobs exist', async () => {
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: [] })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No job postings yet')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first job posting to find the best candidates.')).toBeInTheDocument()
    })
  })

  it('shows empty state for no search results', async () => {
    const mockJobs = [
      { _id: '1', title: 'Senior Engineer', location: { city: 'Mumbai', state: 'MH', country: 'India' }, status: 'open', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
    })

    // Search for something that doesn't exist
    await act(async () => {
      await user.type(screen.getByTestId('search-input'), 'xyznonexistent')
    })

    await waitFor(() => {
      expect(screen.getByText('No matching jobs found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search or status filter.')).toBeInTheDocument()
    })
  })

  it('shows error state when request fails', async () => {
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockRejectedValue({
      message: 'Failed to connect to server',
    })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
      expect(screen.getByText('Failed to connect to server')).toBeInTheDocument()
    })
  })

  it('retries fetching when retry button clicked', async () => {
    jobPostingService.getRecruiterJobs
      // @ts-expect-error TODO: Fix pervasive types
      .mockRejectedValueOnce({ message: 'Network error' })
      .mockResolvedValueOnce({ success: true, jobs: [{ _id: '1', title: 'Job', location: { city: 'Mumbai' }, status: 'open', createdAt: new Date().toISOString() }] })

    renderWithProviders(<RecruiterJobsPage />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
    })

    await act(async () => {
      await user.click(screen.getByTestId('retry-btn'))
    })

    await waitFor(() => {
      expect(jobPostingService.getRecruiterJobs).toHaveBeenCalledTimes(2)
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
    })
  })

  it('filters jobs by title search', async () => {
    const mockJobs = [
      { _id: '1', title: 'Senior React Engineer', location: { city: 'Mumbai', state: 'MH', country: 'India' }, status: 'open', createdAt: new Date().toISOString() },
      { _id: '2', title: 'Node.js Developer', location: { city: 'Delhi', state: 'DL', country: 'India' }, status: 'open', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('job-card-2')).toBeInTheDocument()
    })

    // Search for React
    await act(async () => {
      await user.type(screen.getByTestId('search-input'), 'React')
    })

    await waitFor(() => {
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
      expect(screen.queryByTestId('job-card-2')).not.toBeInTheDocument()
    })
  })

  it('filters jobs by location search', async () => {
    const mockJobs = [
      { _id: '1', title: 'Engineer', location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' }, status: 'open', createdAt: new Date().toISOString() },
      { _id: '2', title: 'Developer', location: { city: 'Delhi', state: 'Delhi', country: 'India' }, status: 'open', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('job-card-2')).toBeInTheDocument()
    })

    // Search for Mumbai
    await act(async () => {
      await user.type(screen.getByTestId('search-input'), 'mumbai')
    })

    await waitFor(() => {
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
      expect(screen.queryByTestId('job-card-2')).not.toBeInTheDocument()
    })
  })

  it('handles missing location gracefully in search', async () => {
    const mockJobs = [
      { _id: '1', title: 'Engineer', location: null, status: 'open', createdAt: new Date().toISOString() },
      { _id: '2', title: 'Developer', location: { city: 'Delhi', state: 'DL', country: 'India' }, status: 'open', createdAt: new Date().toISOString() },
    ]
    // @ts-expect-error TODO: Fix pervasive types
    jobPostingService.getRecruiterJobs.mockResolvedValue({ success: true, jobs: mockJobs })

    renderWithProviders(<RecruiterJobsPage />)

    await waitFor(() => {
      // Both should render without crashing
      expect(screen.getByTestId('job-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('job-card-2')).toBeInTheDocument()
    })
  })
})
