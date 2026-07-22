import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-primary text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">BlueApp</Link>
        <div className="space-x-4">
          <NavLink to="/" className={({ isActive }) => isActive ? 'underline' : ''}>Home</NavLink>
          <NavLink to="/contact" className={({ isActive }) => isActive ? 'underline' : ''}>Contact Us</NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
