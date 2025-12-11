import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import axiosInstance from '../utils/axios'

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    fetchComplaints()
  }, [])

  const fetchComplaints = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get('/admin/complaints')
      setComplaints(response.data)
    } catch (error) {
      console.error('Error fetching complaints:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axiosInstance.patch(`/admin/complaints/${id}/status`, { status: newStatus })
      fetchComplaints()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) {
      return
    }

    try {
      await axiosInstance.delete(`/admin/complaints/${id}`)
      fetchComplaints()
    } catch (error) {
      console.error('Error deleting complaint:', error)
      alert('Failed to delete complaint')
    }
  }

  const filteredComplaints = filter === 'All'
    ? complaints
    : complaints.filter(c => c.status === filter)

  const stats = {
    All: complaints.length,
    Pending: complaints.filter(c => c.status === 'Pending').length,
    'In-Progress': complaints.filter(c => c.status === 'In-Progress').length,
    Resolved: complaints.filter(c => c.status === 'Resolved').length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage all campus complaints</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(stats).map(([key, value]) => (
            <div
              key={key}
              className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition-all transform hover:scale-105 ${
                filter === key ? 'ring-4 ring-red-500 border-2 border-red-500' : 'hover:shadow-xl'
              }`}
              onClick={() => setFilter(key)}
            >
              <p className="text-gray-600 text-sm mb-1 font-semibold">{key}</p>
              <p className="text-3xl font-bold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Filter Buttons */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['All', 'Pending', 'In-Progress', 'Resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                  filter === status
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <p className="mt-4 text-gray-600">Loading complaints...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 text-lg">No complaints found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComplaints.map((complaint) => (
              <ComplaintCard
                key={complaint._id}
                complaint={complaint}
                isAdmin={true}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard

