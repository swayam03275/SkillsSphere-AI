import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../components/Footer";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

const BlogPage = () => {
  useDocumentTitle("Blog | SkillSphere AI");
  const navigate = useNavigate();

  const posts = [
    {
      title: "Introducing our new Resume Analyzer",
      date: "May 28, 2026",
      excerpt: "Today we are thrilled to announce a complete overhaul of our resume parsing engine, powered by the latest generation of LLMs.",
      category: "Product Updates"
    },
    {
      title: "How to Ace the Technical Mock Interview",
      date: "May 15, 2026",
      excerpt: "A comprehensive guide on leveraging the SkillSphere mock interview lobby to prepare for FAANG technical screens.",
      category: "Career Advice"
    },
    {
      title: "The Future of AI in Tech Recruiting",
      date: "April 30, 2026",
      excerpt: "Exploring how automated skill verification and unbiased matching algorithms are changing the landscape for recruiters.",
      category: "Industry Trends"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
          SkillSphere Blog
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-12">
          Insights, updates, and career strategies from our team.
        </p>

        <div className="space-y-8">
          {posts.map((post, idx) => (
            <article key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:border-blue-500/50">
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-3">
                <span className="font-medium text-blue-600 dark:text-blue-400">{post.category}</span>
                <span>•</span>
                <time>{post.date}</time>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                {post.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                {post.excerpt}
              </p>
              <button className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                Read full article
              </button>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPage;
