export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <h1 className="text-4xl font-light text-white mb-2">
          Space Launch Technologies
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Virtual Data Room
        </p>
          <a href="/login" className="px-6 py-3 bg-white text-gray-950 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
          Sign in
        </a>
      </div>
    </div>
  );
}