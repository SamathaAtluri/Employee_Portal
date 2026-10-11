
import { useEffect, useMemo, useState } from 'react'
import api from './api'
import Login from './Login'
import './App.css'

const API = '/employee'

const emptyForm = {
  firstName: '',
  lastName: '',
  age: '',
  department: '',
  designation: '',
  email: '',
  mobilenumber: '',
  salary: '',
  joiningDate: '',
  status: 'Active'
}

function App() {
  const [employees, setEmployees] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    if (authenticated) {
      loadEmployees()
    }
  }, [authenticated])

  const loadEmployees = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get(`${API}/all`)
      setEmployees(response.data)
    } catch {
      setError('Unable to load employees. Please check the backend.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setAuthenticated(false)
    setEmployees([])
    setShowForm(false)
    setFormData({ ...emptyForm })
    setEditingId(null)
    setError('')
    setSuccess('')
  }

  const departments = useMemo(() => {
    return [
      ...new Set(
        employees
          .map(emp => emp.department?.trim())
          .filter(Boolean)
      )
    ].sort()
  }, [employees])

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const searchText = search.trim().toLowerCase()

      const fullName =
        `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase()

      const matchesSearch =
        fullName.includes(searchText) ||
        (emp.email || '').toLowerCase().includes(searchText) ||
        (emp.department || '').toLowerCase().includes(searchText) ||
        (emp.designation || '').toLowerCase().includes(searchText) ||
        String(emp.empno ?? '').includes(searchText)

      const matchesStatus =
        statusFilter === 'All' || emp.status === statusFilter

      const matchesDepartment =
        departmentFilter === 'All' ||
        emp.department === departmentFilter

      return matchesSearch && matchesStatus && matchesDepartment
    })
  }, [employees, search, statusFilter, departmentFilter])

  const activeCount = employees.filter(
    emp => emp.status === 'Active'
  ).length

  const departmentCount = departments.length

  const handleChange = e => {
    const { name, value } = e.target

    setFormData(previous => ({
      ...previous,
      [name]: value
    }))
  }

  const openAddForm = () => {
    setFormData({ ...emptyForm })
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const handleEdit = emp => {
    setFormData({
      firstName: emp.firstName ?? '',
      lastName: emp.lastName ?? '',
      age: emp.age ?? '',
      department: emp.department ?? '',
      designation: emp.designation ?? '',
      email: emp.email ?? '',
      mobilenumber: emp.mobilenumber ?? '',
      salary: emp.salary ?? '',
      joiningDate: emp.joiningDate ?? '',
      status: emp.status ?? 'Active'
    })

    setEditingId(emp.empno)
    setError('')
    setSuccess('')
    setShowForm(true)

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const mobile = String(formData.mobilenumber).trim()

    if (!/^\d{10}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }

    if (Number(formData.age) < 18) {
      setError('Employee age must be at least 18.')
      return
    }

    if (Number(formData.salary) < 0) {
      setError('Salary cannot be negative.')
      return
    }

    const duplicateEmail = employees.some(emp =>
      (emp.email || '').trim().toLowerCase() ===
        formData.email.trim().toLowerCase() &&
      emp.empno !== editingId
    )

    if (duplicateEmail) {
      setError('This email already exists. Please use another email.')
      return
    }

    setSaving(true)

    try {
      const employeeData = {
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        email: formData.email.trim(),
        mobilenumber: mobile,
        age: Number(formData.age),
        salary: Number(formData.salary)
      }

      if (editingId !== null) {
        await api.put(
          `${API}/update/${editingId}`,
          employeeData
        )
      } else {
        await api.post(`${API}/add`, employeeData)
      }

      const wasEditing = editingId !== null

      setShowForm(false)
      setFormData({ ...emptyForm })
      setEditingId(null)

      await loadEmployees()

      setSuccess(
        wasEditing
          ? 'Employee updated successfully!'
          : 'Employee added successfully!'
      )
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to save employee. Please check the backend.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this employee?'
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      await api.delete(`${API}/delete/${id}`)

      await loadEmployees()
      setSuccess('Employee deleted successfully!')

      if (editingId === id) {
        setShowForm(false)
        setEditingId(null)
        setFormData({ ...emptyForm })
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to delete employee. Please check the backend.'
      )
    }
  }

  const cancelForm = () => {
    setShowForm(false)
    setFormData({ ...emptyForm })
    setEditingId(null)
    setError('')
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setDepartmentFilter('All')
  }

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="brand">Emp<span>Manage</span></h2>

        <p className="menu-title">MAIN MENU</p>

        <a className="menu active" href="#dashboard">
          ▦ &nbsp; Dashboard
        </a>

        <a className="menu" href="#employee-list">
          ♙ &nbsp; Employees
        </a>

        <button className="menu menu-button" onClick={openAddForm}>
          ＋ &nbsp; Add Employee
        </button>

        <div className="sidebar-bottom">
          <div className="avatar">SA</div>
          <div>
            <strong>Sam Atluri</strong>
            <p>Administrator</p>
          </div>
        </div>
      </aside>

      <main className="main" id="dashboard">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back! Here's your employee overview.</p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div className="top-avatar">SA</div>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <section className="welcome">
          <div>
            <p className="welcome-small">EMPLOYEE MANAGEMENT</p>
            <h2>Manage your team<br />with confidence.</h2>
            <p>Keep your employee information organized in one place.</p>
          </div>
          <div className="welcome-icon">👥</div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <p>Total Employees</p>
            <h2>{employees.length}</h2>
            <span>Employees in your organization</span>
          </div>

          <div className="stat-card">
            <p>Active Employees</p>
            <h2>{activeCount}</h2>
            <span>Currently active</span>
          </div>

          <div className="stat-card">
            <p>Departments</p>
            <h2>{departmentCount}</h2>
            <span>Across your organization</span>
          </div>
        </section>

        <section className="employees" id="employee-list">
          <div className="section-heading">
            <div>
              <h2>Employee Overview</h2>
              <p>Employee records from your database.</p>
            </div>

            <button onClick={openAddForm}>+ Add Employee</button>
          </div>

          {success && (
            <p className="success-message" role="status">{success}</p>
          )}

          {error && (
            <p className="error-message" role="alert">{error}</p>
          )}

          {showForm && (
            <form className="add-employee-form" onSubmit={handleSubmit}>
              <h3>
                {editingId !== null ? 'Edit Employee' : 'Add New Employee'}
              </h3>

              <div className="form-grid">
                <label>
                  First Name
                  <input name="firstName" value={formData.firstName}
                    onChange={handleChange} maxLength="50" required />
                </label>

                <label>
                  Last Name
                  <input name="lastName" value={formData.lastName}
                    onChange={handleChange} maxLength="50" required />
                </label>

                <label>
                  Age
                  <input type="number" name="age" min="18" max="100"
                    value={formData.age} onChange={handleChange} required />
                </label>

                <label>
                  Department
                  <input name="department" value={formData.department}
                    onChange={handleChange} maxLength="60" required />
                </label>

                <label>
                  Designation
                  <input name="designation" value={formData.designation}
                    onChange={handleChange} maxLength="80" required />
                </label>

                <label>
                  Email
                  <input type="email" name="email" value={formData.email}
                    onChange={handleChange} maxLength="100" required />
                </label>

                <label>
                  Mobile Number
                  <input type="tel" name="mobilenumber"
                    value={formData.mobilenumber} onChange={handleChange}
                    maxLength="10" inputMode="numeric" pattern="[0-9]{10}"
                    title="Enter a 10-digit mobile number" required />
                </label>

                <label>
                  Salary
                  <input type="number" name="salary" min="0" step="0.01"
                    value={formData.salary} onChange={handleChange} required />
                </label>

                <label>
                  Joining Date
                  <input type="date" name="joiningDate"
                    value={formData.joiningDate} onChange={handleChange}
                    required />
                </label>

                <label>
                  Status
                  <select name="status" value={formData.status}
                    onChange={handleChange} required>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={saving}>
                  {saving ? 'Saving...' :
                    editingId !== null ? 'Update Employee' : 'Save Employee'}
                </button>

                <button type="button" className="cancel-button"
                  onClick={cancelForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="filters">
            <div className="search-box">
              <span>⌕</span>
              <input type="search"
                placeholder="Search name, email, department or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search employees" />
            </div>

            <select value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filter by status">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              aria-label="Filter by department">
              <option value="All">All Departments</option>
              {departments.map(department => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <button type="button" className="reset-button"
              onClick={resetFilters}>
              Reset
            </button>
          </div>

          <p className="result-count">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>

          <div className="table-container">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Email</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan="8">Loading employees...</td></tr>
                ) : filteredEmployees.length > 0 ? (
                  filteredEmployees.map(emp => (
                    <tr key={emp.empno}>
                      <td>{emp.empno}</td>
                      <td className="employee-name">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td>{emp.department}</td>
                      <td>{emp.designation}</td>
                      <td>{emp.email}</td>
                      <td>₹{Number(emp.salary).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`status-badge ${
                          emp.status === 'Active'
                            ? 'status-active' : 'status-inactive'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button type="button" className="edit-button"
                            onClick={() => handleEdit(emp)}>
                            Edit
                          </button>

                          <button type="button" className="delete-button"
                            onClick={() => handleDelete(emp.empno)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-state">
                      No employees found. Try changing your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
