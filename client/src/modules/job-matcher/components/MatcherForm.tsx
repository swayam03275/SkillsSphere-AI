import { useState } from "react";
export default function MatcherForm({ onSubmit }) {
  const [type, setType] = useState("existing");
  const [resumeId, setResumeId] = useState("");
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ type, resumeId, file });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-white/20 p-6 rounded-2xl shadow-xl text-gray-900 dark:text-white space-y-6"
    >
      <h2 className="text-xl font-semibold text-center">
        Select Resume Source
      </h2>

      {/* Toggle Buttons */}
      <div className="flex justify-center gap-4">
        
        {/* Existing */}
        <button
          type="button"
          onClick={() => setType("existing")}
          className={`px-5 py-2 rounded-xl transition duration-300
            ${
              type === "existing"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]"
                : "bg-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }
          `}
        >
          Use Existing
        </button>

        {/* Upload */}
        <button
          type="button"
          onClick={() => setType("upload")}
          className={`px-5 py-2 rounded-xl transition duration-300
            ${
              type === "upload"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }
          `}
        >
          Upload New
        </button>
      </div>

      {/* Input Section */}
      {type === "existing" ? (
        <input
          type="text"
          placeholder="Enter Resume ID"
          value={resumeId}
          onChange={(e) => setResumeId(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      ) : (
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0
          file:bg-indigo-600 file:text-white
          hover:file:bg-indigo-700"
        />
      )}

      {/* Main Button */}
      <button
        type="submit"
        className="w-full py-3 rounded-xl font-medium 
        bg-gradient-to-r from-indigo-500 to-purple-600 text-white
        shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]
        hover:shadow-[0_6px_20px_0_rgba(79,70,229,0.6)]
        hover:scale-105 hover:brightness-110
        active:scale-95 transition duration-300"
      >
        🚀 Get Recommendations
      </button>
    </form>
  );
}