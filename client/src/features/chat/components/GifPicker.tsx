/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/marketing_ui/input';
import { searchGifs, type GifResult } from '../services/chatApi';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
}

export function GifPicker({ onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Debounce search
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGifsData = useCallback(async (searchQuery: string, currentOffset: number, append: boolean = false) => {
    if (!hasMore && append) return;
    
    setIsLoading(true);
    try {
      const data = await searchGifs(searchQuery, currentOffset, 20);
      
      if (append) {
        setGifs(prev => [...prev, ...data.results]);
      } else {
        setGifs(data.results);
      }
      
      setHasMore(data.pagination.count === 20);
    } catch (error) {
      console.error('Failed to fetch GIFs', error);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore]);

  // Initial load (trending)
  useEffect(() => {
    fetchGifsData('', 0, false);
  }, [fetchGifsData]);

  // Handle search input with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOffset(0);
    setHasMore(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      fetchGifsData(val, 0, false);
    }, 500);
  };

  // Handle scroll for infinite loading
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 100) {
      if (!isLoading && hasMore) {
        const nextOffset = offset + 20;
        setOffset(nextOffset);
        fetchGifsData(query, nextOffset, true);
      }
    }
  };

  return (
    <div className="flex flex-col" style={{ width: '100%', height: '350px' }}>
      <div className="p-2 border-b flex items-center relative">
        <Search className="w-4 h-4 absolute left-4 text-muted-foreground" />
        <Input 
          value={query}
          onChange={handleSearchChange}
          placeholder="Search GIFs..."
          className="pl-8 h-9 text-sm w-full bg-secondary/50 border-none focus-visible:ring-1"
        />
      </div>
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 p-2 overflow-y-auto"
        style={{ overflowY: 'auto' }}
      >
        {gifs.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No GIFs found
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          {gifs.map((gif, index) => (
            <div 
              key={`${gif.id}-${index}`} 
              className="relative cursor-pointer rounded-md overflow-hidden group bg-secondary/50 aspect-square flex items-center justify-center"
              onClick={() => onSelect(gif.url)}
            >
              <img 
                src={gif.preview_url} 
                alt={gif.title || 'GIF'} 
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>
        
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
