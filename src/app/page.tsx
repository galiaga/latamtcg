import PopularCards from '@/components/PopularCards'

export default function Home() {
  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="text-center py-4 px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
            Welcome to LatamTCG
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover and collect Magic: The Gathering cards with real-time pricing and seamless shopping experience.
          </p>
        </section>

        {/* Popular Cards Section */}
        <PopularCards />
      </div>
    </div>
  )
}
