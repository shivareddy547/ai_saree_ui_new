import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold text-primary mb-4">Welcome to Blue Themed App</h1>
      <p className="text-lg text-gray-700">This is the Home page built with React + TypeScript + Tailwind CSS.</p>
    </div>
  );
};

export default Home;
