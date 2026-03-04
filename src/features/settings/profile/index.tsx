import ContentSection from '../components/content-section'

export default function SettingsProfile() {
  return (
    <ContentSection
      title='Profile'
      desc='This is how others will see you on the site.'
    >
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium">Profile Settings</h4>
          <p className="text-sm text-muted-foreground">
            Manage your profile information and preferences.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Profile form will be loaded here.
          </p>
        </div>
      </div>
    </ContentSection>
  )
}
