const ComplaintCard = ({ complaint, onDelete, onStatusChange, isAdmin = false }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'In-Progress':
        return 'bg-blue-100 text-blue-800'
      case 'Resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      Infrastructure: 'bg-purple-100 text-purple-800',
      Academic: 'bg-indigo-100 text-indigo-800',
      Hostel: 'bg-pink-100 text-pink-800',
      Cafeteria: 'bg-orange-100 text-orange-800',
      Other: 'bg-gray-100 text-gray-800',
    }
    return colors[category] || colors.Other
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-t-4 border-primary-500">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
            {complaint.title}
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(complaint.category)}`}>
              {complaint.category}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(complaint.status)}`}>
              {complaint.status}
            </span>
          </div>
        </div>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-3">{complaint.description}</p>

      {isAdmin && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Student:</span> {complaint.studentName}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Email:</span> {complaint.studentEmail}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
        {isAdmin && (
          <>
            <select
              value={complaint.status}
              onChange={(e) => onStatusChange(complaint._id, e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="Pending">Pending</option>
              <option value="In-Progress">In-Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <button
              onClick={() => onDelete(complaint._id)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Created: {new Date(complaint.createdAt).toLocaleDateString()}
      </p>
    </div>
  )
}

export default ComplaintCard

