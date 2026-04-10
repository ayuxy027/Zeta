import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';

const Footer: React.FC = () => {
    const navigate = useNavigate();

    const currentYear = new Date().getFullYear();

    const footerLinks = {
        product: [
            { label: 'Features', path: '/about' },
            { label: 'Pricing', path: '/pricing' },
            { label: 'Changelog', path: '/changelog' },
        ],
        company: [
            { label: 'About', path: '/about' },
            { label: 'Blog', path: '/blog' },
            { label: 'Contact', path: '/about' },
        ],
        legal: [
            { label: 'Privacy', path: '#' },
            { label: 'Terms', path: '#' },
            { label: 'Security', path: '#' },
        ],
    };

    return (
        <footer className="bg-white border-t border-gray-200">
            <div className="px-6 mx-auto max-w-7xl py-12 lg:px-8 lg:py-16">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center space-x-2 mb-4 hover:opacity-80 transition-opacity duration-200"
                        >
                            <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
                                <Mic className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-display font-bold text-gray-900">Zeta</span>
                        </button>
                        <p className="text-sm text-gray-600">
                            Twelve AI agents as plugins—your marketplace for work answers.
                        </p>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h3 className="text-sm font-semibold tracking-wide text-gray-900 uppercase mb-4">
                            Product
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link, index) => (
                                <li key={index}>
                                    <button
                                        onClick={() => navigate(link.path)}
                                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                    >
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="text-sm font-semibold tracking-wide text-gray-900 uppercase mb-4">
                            Company
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link, index) => (
                                <li key={index}>
                                    <button
                                        onClick={() => navigate(link.path)}
                                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                    >
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h3 className="text-sm font-semibold tracking-wide text-gray-900 uppercase mb-4">
                            Legal
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link, index) => (
                                <li key={index}>
                                    <a
                                        href={link.path}
                                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <p className="text-sm text-gray-600">
                            © {currentYear} Zeta. All rights reserved.
                        </p>
                        <p className="text-sm text-gray-600">
                            Plug in agents. Ask once. Skip the tab maze.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

