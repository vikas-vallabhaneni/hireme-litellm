'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Send, Loader2, Zap, Clock, Coins, Trophy, Copy, Check, GitBranch, Sparkles } from 'lucide-react';

const LAMBDA_URL = process.env.NEXT_PUBLIC_LAMBDA_URL || 'https://YOUR-FUNCTION-URL.lambda-url.us-east-1.on.aws/';

interface ModelResponse {
  content?: string;
  chunks?: string[];
  latency?: number;
  tokens?: number;
  cost?: number;
  error?: string;
  model_used?: string;
  streaming?: boolean;
  displayContent?: string;
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
  const [streamingModels, setStreamingModels] = useState<Set<string>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponses({});
    setCopied(null);
    setStreamingModels(new Set());
    
    try {
      const { data } = await axios.post(LAMBDA_URL, { prompt });
      
      // Immediately prepare and show chart data
      const chart: ChartData[] = Object.entries(data)
        .filter(([_, result]) => !(result as ModelResponse).error)
        .map(([model, result]) => ({
          model: model.split('/').pop()?.split('-')[0] || model,
          latency: (result as ModelResponse).latency || 0,
          tokens: (result as ModelResponse).tokens || 0,
          cost: ((result as ModelResponse).cost || 0) * 1000
        }));
      setChartData(chart);
      setLoading(false); // Stop loading immediately after getting data
      
      // Process responses with streaming animation (independently)
      Object.entries(data as Record<string, ModelResponse>).forEach(([model, result]) => {
        if (result.chunks && result.chunks.length > 0) {
          // Animate streaming for models with chunks
          animateStreaming(model, result);
        } else {
          // Set response immediately for non-chunked responses
          setResponses(prev => ({
            ...prev,
            [model]: result as ModelResponse
          }));
        }
      });
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error connecting to API. Please check console.');
      setLoading(false);
    }
  };

  const animateStreaming = (model: string, result: ModelResponse) => {
    if (!result.chunks) return;
    
    setStreamingModels(prev => new Set(prev).add(model));
    
    // Initialize with empty content but include metrics immediately
    setResponses(prev => ({
      ...prev,
      [model]: {
        ...result,
        displayContent: '',
        streaming: true,
        // Keep all metrics available immediately
        latency: result.latency,
        tokens: result.tokens,
        cost: result.cost
      }
    }));
    
    // Animate chunks appearing
    let currentChunk = 0;
    let currentText = '';
    const chunks = result.chunks;
    const chunkDelay = Math.min(50, 2000 / chunks.length); // Adjust speed based on chunk count
    
    const streamInterval = setInterval(() => {
      if (currentChunk < chunks.length) {
        currentText += chunks[currentChunk];
        setResponses(prev => ({
          ...prev,
          [model]: {
            ...prev[model],
            displayContent: currentText,
            streaming: true
          }
        }));
        currentChunk++;
      } else {
        // Streaming complete
        clearInterval(streamInterval);
        setResponses(prev => ({
          ...prev,
          [model]: {
            ...prev[model],
            content: result.content,
            displayContent: result.content,
            streaming: false
          }
        }));
        setStreamingModels(prev => {
          const newSet = new Set(prev);
          newSet.delete(model);
          return newSet;
        });
      }
    }, chunkDelay);
  };

  const copyResponse = async (model: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(model);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(model);
        setTimeout(() => setCopied(null), 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const getFastestModel = () => {
    const entries = Object.entries(responses);
    if (entries.length === 0) return null;
    
    return entries.reduce((min, [model, data]) => 
      ((data.latency ?? Infinity) < min.latency) ? { model, latency: data.latency ?? Infinity } : min
    , {model: '', latency: Infinity}).model;
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const isList = lines.some(line => 
      /^[\d]+\./.test(line.trim()) || 
      /^[-*•]/.test(line.trim()) ||
      /^\s*[-*•]/.test(line)
    );

    if (isList) {
      return (
        <div className="space-y-1">
          {lines.map((line, index) => {
            if (!line.trim()) return null;
            
            const isListItem = /^[\d]+\./.test(line.trim()) || /^[-*•]/.test(line.trim()) || /^\s*[-*•]/.test(line);
            
            if (isListItem) {
              const cleanedLine = line.replace(/^(\s*)[-*•]\s*/, '$1• ').replace(/^(\s*)(\d+\.)\s*/, '$1$2 ');
              return (
                <div key={index} className="pl-2">
                  {cleanedLine}
                </div>
              );
            }
            
            return <div key={index}>{line}</div>;
          })}
        </div>
      );
    }
    
    return (
      <p className="whitespace-pre-wrap">{content}</p>
    );
  };

  const examplePrompts = [
    "What is an LLM Gateway?",
    "Write a haiku about AI.",
    "Why is Vikas the best candidate for the job?",
    "What is the difference between httpx and aiohttp?"
  ];

  const barColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
  const fastestModel = getFastestModel();

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { model: string; latency: number } }[] }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-white/20">
          <p className="font-semibold">{payload[0].payload.model}</p>
          <p className="text-sm">Latency: {payload[0].payload.latency}s</p>
        </div>
      );
    }
    return null;
  };

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
                {examplePrompts.map((example, i) => {
                  const isSpecial = example.includes("Vikas");
                  
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPrompt(example)}
                      className={
                        isSpecial 
                          ? "relative px-4 py-2 text-sm font-medium bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-lg transition-all transform hover:scale-105 shadow-lg animate-pulse-glow"
                          : "px-3 py-1.5 text-sm bg-purple-800/50 hover:bg-purple-700/50 text-white rounded-lg transition-colors hover:text-white"
                      }
                      style={isSpecial ? {
                        animation: 'pulse-glow 2s ease-in-out infinite',
                        boxShadow: '0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3)'
                      } : {}}
                    >
                      {isSpecial && (
                        <>
                          <span className="absolute -top-1 -right-1">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                            </span>
                          </span>
                          <Sparkles className="inline-block w-3 h-3 mr-1" />
                        </>
                      )}
                      {example}
                    </button>
                  );
                })}
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

        {/* Loading State - only show if actually loading */}
        {loading && Object.keys(responses).length === 0 && (
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

        {/* Performance Chart - Shows immediately */}
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
                <Tooltip content={<CustomTooltip />} />
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
            {Object.entries(responses).map(([model, result]) => {
              const isStreaming = streamingModels.has(model);
              const contentToDisplay = result.displayContent || result.content || '';
              
              return (
                <div
                  key={model}
                  className={`bg-white/10 backdrop-blur-md rounded-xl p-6 border ${
                    model === fastestModel ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-white/20'
                  } transition-all hover:bg-white/15`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                        {model}
                        {isStreaming && (
                          <span className="inline-flex">
                            <span className="animate-pulse text-green-400 text-xs">● Streaming</span>
                          </span>
                        )}
                      </h3>
                      {model === fastestModel && !isStreaming && (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-400 mt-1">
                          <Trophy className="h-3 w-3" />
                          Fastest Response
                        </span>
                      )}
                    </div>
                    {contentToDisplay && !isStreaming && (
                      <button
                        onClick={() => copyResponse(model, contentToDisplay)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                        title="Copy response"
                      >
                        {copied === model ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-purple-300 group-hover:text-white" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Metrics - Always show, even during streaming */}
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
                      <>
                        {contentToDisplay && renderFormattedContent(contentToDisplay)}
                        {isStreaming && (
                          <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 text-center text-purple-200">
        <p className="mb-2">Built to showcase LiteLLMs unified API capabilities</p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <a href="https://github.com/vikas-vallabhaneni/hireme-litellm" className="hover:text-white transition-colors">
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