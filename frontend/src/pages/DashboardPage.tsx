import React from 'react';

const DashboardPage: React.FC = () => {
  const stats = [
    { name: 'Total Meetings', value: 124 },
    { name: 'Hours Transcribed', value: 248 },
    { name: 'Action Items', value: 89 },
    { name: 'Members', value: 12 }
  ];

  const recentMeetings = [
    { id: 1, name: 'Team Sync Meeting', date: 'Nov 10, 2024', duration: '45 min', status: 'Completed' },
    { id: 2, name: 'Product Planning', date: 'Nov 9, 2024', duration: '1 hr 15 min', status: 'Completed' },
    { id: 3, name: 'Weekly Review', date: 'Nov 8, 2024', duration: '30 min', status: 'Completed' },
    { id: 4, name: 'Client Call', date: 'Nov 7, 2024', duration: '1 hr', status: 'Processing' }
  ];

  const recentActivity = [
    { id: 1, action: 'New meeting transcribed', meeting: 'Team Sync Meeting', time: '2 hours ago' },
    { id: 2, action: 'Action items generated', meeting: 'Product Planning', time: '1 day ago' },
    { id: 3, action: 'Summary shared', meeting: 'Weekly Review', time: '2 days ago' }
  ];

  return (
    <div className="min-h-screen bg-vintage-white pt-20">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500 text-sm">{stat.name}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
          ))}
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">Weekly Activity</h2>
            <div className="h-64 flex items-end space-x-2 pt-8">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                // Using index to create a deterministic height instead of random
                const heights = [30, 60, 45, 75, 50, 20, 40]; // Fixed values for consistent rendering
                const height = heights[index % heights.length];
                return (
                  <div key={day} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors" 
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs mt-2 text-gray-500">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">Recent Meetings</h2>
            <div className="space-y-4">
              {recentMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0">
                  <div>
                    <h3 className="font-medium">{meeting.name}</h3>
                    <p className="text-sm text-gray-500">{meeting.date} • {meeting.duration}</p>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      meeting.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {meeting.status}
                    </span>
                    <button className="ml-4 text-indigo-600 hover:underline">View</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-full mr-4">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                </div>
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.meeting} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;