"use client";

/* eslint-disable react/no-unescaped-entities */
export function Team() {
  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-bold mb-6 text-center">
          Meet the <span className="text-[#00FF94]">MORRA</span> Team
        </h1>
        <p className="text-[#A0A0A0] text-center mb-12 max-w-2xl mx-auto leading-relaxed">
          MORRA is built by a small independent team focused on AI tools and digital creativity. We ship products for
          artists on <strong className="text-white">morra.store</strong> with an emphasis on clarity, speed, and fair pricing.
        </p>

        <div className="p-8 rounded-2xl bg-[#121212] border border-[#00FF94]/20">
          <h2 className="text-2xl font-bold text-white mb-4">Mission</h2>
          <p className="text-[#A0A0A0] leading-relaxed">
            We want every artist, whether in a bedroom studio or on tour, to access practical AI workflows that respect
            their time and creative intent. Feedback from the morra.store community shapes what we build next.
          </p>
        </div>

        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-[#00FF94]/10 to-[#9BFF00]/10 border border-[#00FF94]/30 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Get in touch</h2>
          <p className="text-[#A0A0A0] leading-relaxed">
            Users can contact support via the <strong className="text-white">AI assistant</strong> on{" "}
            <strong className="text-white">morra.store</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
