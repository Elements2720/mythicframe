
import { CsvCardData } from "../types";

export const parseCSV = (content: string): CsvCardData[] => {
  if (!content) return [];
  
  // Normalize line endings and split
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Robust line parser that handles quotes and commas inside quotes manually
  // This avoids complex regex that can cause SyntaxErrors in some browser engines
  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let cell = '';
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Handle Quotes
      if (char === '"') {
        if (insideQuote && text[i + 1] === '"') {
          // Escaped quote ("") -> becomes single quote (")
          cell += '"';
          i++; 
        } else {
          // Toggle state
          insideQuote = !insideQuote;
        }
      } 
      // Handle Comma (if not inside quotes)
      else if (char === ',' && !insideQuote) {
        result.push(cell.trim());
        cell = '';
      } 
      // Standard Character
      else {
        cell += char;
      }
    }
    // Push last cell
    result.push(cell.trim());
    return result;
  };

  // Parse Header
  const headers = parseLine(lines[0]).map(h => h.toLowerCase());
  const data: CsvCardData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseLine(line);
    const entry: CsvCardData = {};
    
    headers.forEach((h, idx) => {
      entry[h] = values[idx] || '';
    });
    data.push(entry);
  }

  return data;
};

export const mapCsvRowToCard = (row: CsvCardData) => {
  const findValue = (keys: string[]) => {
    for (const k of keys) {
      if (row[k]) return row[k];
    }
    return null;
  };

  return {
    name: findValue(['name', 'title', 'cardname', 'card_name', 'card name']),
    mana: findValue(['mana', 'cost', 'manacost', 'mana_cost', 'mana cost']),
    effects: findValue(['description', 'text', 'effects', 'ability', 'flavor', 'flavortext', 'card text'])
  };
};
