import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: () => {
    const user = useAuthStore((s) => s.auth.user)
    const [formData, setFormData] = useState({
      username: user?.name || user?.username || '',
      email: user?.email || '',
      bio: user?.bio || 'Tell us about yourself...'
    })

    const handleInputChange = (field: string, value: string) => {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }

    const handleSubmit = () => {
      // Here you can add logic to save the updated profile
      console.log('Updated profile data:', formData)
      alert('Profile updated successfully!')
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Profile</h3>
          <p className="text-sm text-muted-foreground">
            This is how others will see you on the site.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="text-sm font-medium mb-2">Profile Information</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Username</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter username" 
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email" 
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <textarea 
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself" 
                  className="w-full mt-1 px-3 py-2 border rounded-md resize-none"
                  rows={3}
                />
              </div>
              <button 
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  },
})
