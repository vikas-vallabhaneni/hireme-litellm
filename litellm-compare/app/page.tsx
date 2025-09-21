'use client';

import { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Send, Loader2, Zap, Clock, Coins, Trophy, Copy, Check, GitBranch, Sparkles } from 'lucide-react';

// Replace with your Lambda Function URL
const LAMBDA_URL = process.env.NEXT_PUBLIC_LAMBDA_URL || 'https://YOUR-FUNCTION-URL.lambda-url.us-east-1.on.aws/';

interface ModelResponse {
  content?: string;
  latency?: number;
  tokens?: number;
  cost?: number;
  error?: string;
  model_used?: string;
}

interface ChartData {
  model: string;
  latency: number;
  tokens: number;
  cost: number;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<Record<string, ModelResponse>>({});
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponses({});
    
    try {
      const { data } = await axios.post(LAMBDA_URL, { prompt });
      setResponses(data);
      
      // Prepare chart data
      const chart: ChartData[] = Object.entries(data)
        .filter(([_, result]) => !(result as ModelResponse).error)
        .map(([model, result]) => ({
          model: model.split('/').pop()?.split('-')[0] || model,
          latency: (result as ModelResponse).latency || 0,
          tokens: (result as ModelResponse).tokens || 0,
          cost: ((result as ModelResponse).cost || 0) * 1000
        }));
      setChartData(chart);
    } catch (error) {
      console.error('Error:', error);
      alert('Error connecting to API. Please check console.');
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = (model: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(model);
    setTimeout(() => setCopied(null), 2000);
  };

  const getFastestModel = () => {
    const entries = Object.entries(responses);
    if (entries.length === 0) return null;
    
    return entries.reduce((min, [model, data]) => 
      ((data.latency ?? Infinity) < min.latency) ? { model, latency: data.latency ?? Infinity } : min
    , {model: '', latency: Infinity}).model;
  };

  const examplePrompts = [
    "Explain serverless computing in one sentence",
    "Write a haiku about AWS Lambda",
    "What are the benefits of using LiteLLM?",
    "Compare Python and JavaScript for backend"
  ];

  const barColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
  const fastestModel = getFastestModel();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 to-pink-800/20 backdrop-blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Zap className="h-10 w-10 text-yellow-400" />
              <h1 className="text-4xl sm:text-5xl font-bold text-white">
                LiteLLM Comparison Tool
              </h1>
            </div>
            <p className="text-xl text-purple-200 mb-6">
              Compare multiple LLMs with a unified API interface
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Next.js', 'TypeScript', 'AWS Lambda', 'LiteLLM', 'TailwindCSS'].map((tech) => (
                <span key={tech} className="px-3 py-1 text-sm bg-white/10 backdrop-blur-md text-white rounded-full border border-white/20">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Enter your prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything to compare model responses..."
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-md text-white placeholder-purple-300 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
            />
            
            {/* Example Prompts */}
            <div className="mt-4">
              <span className="text-sm text-purple-200">Try an example:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="px-3 py-1.5 text-sm bg-purple-800/50 hover:bg-purple-700/50 text-white rounded-lg transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Querying Models...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Compare Models
                </>
              )}
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-3/4 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-white/20 rounded"></div>
                    <div className="h-3 bg-white/20 rounded w-5/6"></div>
                    <div className="h-3 bg-white/20 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance Chart */}
        {chartData.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              Performance Metrics
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="model" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="latency" name="Latency (s)" radius={[8, 8, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Response Cards */}
        {Object.keys(responses).length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(responses).map(([model, result]) => (
              <div
                key={model}
                className={`bg-white/10 backdrop-blur-md rounded-xl p-6 border ${
                  model === fastestModel ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-white/20'
                } transition-all hover:bg-white/15`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white text-lg">{model}</h3>
                    {model === fastestModel && (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-400 mt-1">
                        <Trophy className="h-3 w-3" />
                        Fastest Response
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => result.content && copyResponse(model, result.content)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    disabled={!result.content}
                  >
                    {copied === model ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-purple-300" />
                    )}
                  </button>
                </div>

                {/* Metrics */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {result.latency && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-md">
                      <Clock className="h-3 w-3" />
                      {result.latency}s
                    </span>
                  )}
                  {result.tokens && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-md">
                      <Coins className="h-3 w-3" />
                      {result.tokens} tokens
                    </span>
                  )}
                  {result.model_used && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-md">
                      <GitBranch className="h-3 w-3" />
                      via {result.model_used}
                    </span>
                  )}
                </div>

                {/* Response Content */}
                <div className="text-sm text-purple-100 leading-relaxed">
                  {result.error ? (
                    <p className="text-red-400">Error: {result.error}</p>
                  ) : (
                    <p>{result.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 text-center text-purple-200">
        <p className="mb-2">Built to showcase LiteLLMs unified API capabilities</p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <a href="https://github.com/yourusername/litellm-compare" className="hover:text-white transition-colors">
            View on GitHub
          </a>
          <span>•</span>
          <a href="https://docs.litellm.ai" className="hover:text-white transition-colors">
            LiteLLM Docs
          </a>
        </div>
      </footer>
    </div>
  );
}