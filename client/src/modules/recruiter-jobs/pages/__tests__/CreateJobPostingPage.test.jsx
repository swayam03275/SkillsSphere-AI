import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import CreateJobPostingPage from '../CreateJobPostingPage'
import * as jobPostingService from '../../services/jobPostingService'
import { ToastProvider } from '../../../../shared/components'


// Mock the service
vi.mock('../../services/jobPostingService', () => ({
  createJobPosting: vi.fn(),
}))

// Mock the components
vi.mock('../../../../modules/landing/components/Navbar', () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}))

vi.mock('../../../../shared/components/Input', () => ({
  default: ({ id, label, value, onChange, error, type = 'text', ...props }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        data-testid={`input-${id}`}
        {...props}
      />
      {error && <span data-testid={`error-${id}`}>{error}</span>}
    </div>
  ),
}))

vi.mock('../../../../shared/components/Select', () => ({
  default: ({ id, label, value, onChange, options, ...props }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        data-testid={`select-${id}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
}))

vi.mock('../../../../shared/components/Button', () => ({
  default: ({ children, loading, ...props }) => (
    <button disabled={loading} data-testid="submit-btn" {...props}>
      {loading ? 'Loading...' : children}
    </button>
  ),
}))

const createMockStore = (authState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { token: 'test-token', ...authState }) => state,
    },
  })
}

const renderWithProviders = (component, { store = createMockStore() } = {}) => {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ToastProvider>{component}</ToastProvider>
      </MemoryRouter>
    </Provider>
  )
}

describe('CreateJobPostingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all required form fields', () => {
    renderWithProviders(<CreateJobPostingPage />)

    expect(screen.getByTestId('input-title')).toBeInTheDocument()
    expect(screen.getByTestId('select-status')).toBeInTheDocument()
    expect(screen.getByTestId('input-description')).toBeInTheDocument()
    expect(screen.getByTestId('input-skills')).toBeInTheDocument()
    expect(screen.getByTestId('input-location.city')).toBeInTheDocument()
    expect(screen.getByTestId('input-location.state')).toBeInTheDocument()
    expect(screen.getByTestId('input-location.country')).toBeInTheDocument()
    expect(screen.getByTestId('input-salary.min')).toBeInTheDocument()
    expect(screen.getByTestId('input-salary.max')).toBeInTheDocument()
    expect(screen.getByTestId('select-salary.currency')).toBeInTheDocument()
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument()
  })

  it('has default values for status, country, and currency', () => {
    renderWithProviders(<CreateJobPostingPage />)

    expect(screen.getByTestId('select-status')).toHaveValue('draft')
    expect(screen.getByTestId('input-location.country')).toHaveValue('India')
    expect(screen.getByTestId('select-salary.currency')).toHaveValue('INR')
  })

  it('validates required fields before submission', async () => {
    renderWithProviders(<CreateJobPostingPage />)
    const user = userEvent.setup()

    // Try to submit empty form
    await user.click(screen.getByTestId('submit-btn'))

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByTestId('error-title')).toHaveTextContent('Job title is required')
      expect(screen.getByTestId('error-description')).toHaveTextContent('Description must be at least 20 characters')
      expect(screen.getByTestId('error-skills')).toHaveTextContent('At least one skill is required')
      expect(screen.getByTestId('error-location.city')).toHaveTextContent('City is required')
      expect(screen.getByTestId('error-location.state')).toHaveTextContent('State is required')
      expect(screen.getByTestId('error-salary.min')).toHaveTextContent('Minimum salary is required')
      expect(screen.getByTestId('error-salary.max')).toHaveTextContent('Maximum salary is required')
    })

    // Should not call API
    expect(jobPostingService.createJobPosting).not.toHaveBeenCalled()
  })

  it('validates salary range (max >= min)', async () => {
    renderWithProviders(<CreateJobPostingPage />)
    const user = userEvent.setup()

    // Fill required fields
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'Test Job' } })
    fireEvent.change(screen.getByTestId('input-description'), { target: { value: 'Test description that is long enough' } })
    fireEvent.change(screen.getByTestId('input-skills'), { target: { value: 'react, node' } })
    fireEvent.change(screen.getByTestId('input-location.city'), { target: { value: 'Mumbai' } })
    fireEvent.change(screen.getByTestId('input-location.state'), { target: { value: 'MH' } })
    fireEvent.change(screen.getByTestId('input-salary.min'), { target: { value: '100000' } })
    fireEvent.change(screen.getByTestId('input-salary.max'), { target: { value: '50000' } }) // Less than min

    await user.click(screen.getByTestId('submit-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('error-salary.max')).toHaveTextContent('greater than or equal to minimum')
    })

    expect(jobPostingService.createJobPosting).not.toHaveBeenCalled()
  })

  it('submits transformed payload on valid form', async () => {
    jobPostingService.createJobPosting.mockResolvedValue({ success: true })

    renderWithProviders(<CreateJobPostingPage />)
    const user = userEvent.setup()

    // Fill all required fields
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'Senior Engineer' } })
    fireEvent.change(screen.getByTestId('input-description'), { target: { value: 'This is a detailed job description that meets minimum requirements' } })
    fireEvent.change(screen.getByTestId('input-skills'), { target: { value: 'React, Node.js, TypeScript' } })
    fireEvent.change(screen.getByTestId('input-location.city'), { target: { value: 'Mumbai' } })
    fireEvent.change(screen.getByTestId('input-location.state'), { target: { value: 'Maharashtra' } })
    fireEvent.change(screen.getByTestId('input-salary.min'), { target: { value: '800000' } })
    fireEvent.change(screen.getByTestId('input-salary.max'), { target: { value: '1500000' } })

    // Change status
    await user.selectOptions(screen.getByTestId('select-status'), 'open')

    await user.click(screen.getByTestId('submit-btn'))

    await waitFor(() => {
      expect(jobPostingService.createJobPosting).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Senior Engineer',
          description: expect.stringContaining('detailed job description'),
          skills: ['react', 'node.js', 'typescript'], // lowercase, array, trimmed
          status: 'open',
          location: expect.objectContaining({
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            remote: false,
          }),
          salary: expect.objectContaining({
            min: 800000, // converted to number
            max: 1500000,
            currency: 'INR',
            isNegotiable: false,
          }),
        }),
        'test-token'
      )
    })
  })

  it('disables submit button during submission', async () => {
    jobPostingService.createJobPosting.mockImplementation(() => 
      new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    )

    renderWithProviders(<CreateJobPostingPage />)
    const user = userEvent.setup()

    // Fill required fields
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'Test Job' } })
    fireEvent.change(screen.getByTestId('input-description'), { target: { value: 'Test description that is long enough for validation' } })
    fireEvent.change(screen.getByTestId('input-skills'), { target: { value: 'react' } })
    fireEvent.change(screen.getByTestId('input-location.city'), { target: { value: 'Mumbai' } })
    fireEvent.change(screen.getByTestId('input-location.state'), { target: { value: 'MH' } })
    fireEvent.change(screen.getByTestId('input-salary.min'), { target: { value: '100000' } })
    fireEvent.change(screen.getByTestId('input-salary.max'), { target: { value: '200000' } })

    await user.click(screen.getByTestId('submit-btn'))

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByTestId('submit-btn')).toHaveTextContent('Posting...')
      expect(screen.getByTestId('submit-btn')).toBeDisabled()
    })
  })

  it('displays backend validation errors in correct fields', async () => {
    const backendError = {
      message: 'Validation failed',
      errors: {
        'location.city': 'City is required',
        'salary.min': 'Minimum salary must be positive',
        title: 'Title is too short',
      },
    }
    jobPostingService.createJobPosting.mockRejectedValue(backendError)

    renderWithProviders(<CreateJobPostingPage />)
    const user = userEvent.setup()

    // Fill form to bypass client validation
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'Test Job' } })
    fireEvent.change(screen.getByTestId('input-description'), { target: { value: 'Test description that is long enough for validation purposes' } })
    fireEvent.change(screen.getByTestId('input-skills'), { target: { value: 'react, node' } })
    fireEvent.change(screen.getByTestId('input-location.city'), { target: { value: 'Mumbai' } })
    fireEvent.change(screen.getByTestId('input-location.state'), { target: { value: 'MH' } })
    fireEvent.change(screen.getByTestId('input-salary.min'), { target: { value: '100000' } })
    fireEvent.change(screen.getByTestId('input-salary.max'), { target: { value: '200000' } })

    await user.click(screen.getByTestId('submit-btn'))

    await waitFor(() => {
      // Mapped errors should appear
      expect(screen.getByTestId('error-location.city')).toHaveTextContent('City is required')
      expect(screen.getByTestId('error-salary.min')).toHaveTextContent('Minimum salary must be positive')
      expect(screen.getByTestId('error-title')).toHaveTextContent('Title is too short')
    })
  })

  it('displays generic error banner for API failures', async () => {
    jobPostingService.createJobPosting.mockRejectedValue({
      message: 'Unable to connect to server',
    })

    renderWithProviders(<CreateJobPostingPage />)
    const user = userEvent.setup()

    // Fill form
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'Test Job' } })
    fireEvent.change(screen.getByTestId('input-description'), { target: { value: 'Test description that is long enough for validation' } })
    fireEvent.change(screen.getByTestId('input-skills'), { target: { value: 'react' } })
    fireEvent.change(screen.getByTestId('input-location.city'), { target: { value: 'Mumbai' } })
    fireEvent.change(screen.getByTestId('input-location.state'), { target: { value: 'MH' } })
    fireEvent.change(screen.getByTestId('input-salary.min'), { target: { value: '100000' } })
    fireEvent.change(screen.getByTestId('input-salary.max'), { target: { value: '200000' } })

    await user.click(screen.getByTestId('submit-btn'))

    await waitFor(() => {
      expect(screen.getAllByText('Unable to connect to server').length).toBeGreaterThan(0)
    })
  })

  it('clears field error when user edits the field', async () => {
    renderWithProviders(<CreateJobPostingPage />)
    const user = userEvent.setup()

    // Submit empty to trigger errors
    await user.click(screen.getByTestId('submit-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('error-title')).toBeInTheDocument()
    })

    // Edit the field
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'New Title' } })

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByTestId('error-title')).not.toBeInTheDocument()
    })
  })
})
