import { Lawyer, allLawyers } from '../data/lawyerData';

export interface LegalPattern {
    keywords: string[];
    specializations: string[];
    priority: number;
    context?: string[];
}

export interface MatchResult {
    lawyer: Lawyer;
    matchScore: number;
    matchedPatterns: string[];
    reasoning: string;
}

export class LegalPatternMatcher {
    private patterns: LegalPattern[] = [
        // Corporate Law Patterns
        {
            keywords: ['company', 'business', 'corporate', 'merger', 'acquisition', 'm&a', 'board', 'shareholder', 'stakeholder', 'ipo', 'startup', 'venture', 'investment', 'funding', 'equity', 'partnership', 'joint venture'],
            specializations: ['Corporate Law', 'Business Law', 'Commercial Law'],
            priority: 1,
            context: ['business formation', 'corporate governance', 'commercial transactions']
        },
        // Criminal Law Patterns
        {
            keywords: ['criminal', 'arrest', 'bail', 'court', 'trial', 'charges', 'offense', 'crime', 'police', 'investigation', 'prosecution', 'defense', 'sentencing', 'appeal', 'conviction', 'acquittal'],
            specializations: ['Criminal Law', 'Criminal Defense'],
            priority: 1,
            context: ['criminal defense', 'legal representation', 'court proceedings']
        },
        // Family Law Patterns
        {
            keywords: ['divorce', 'marriage', 'custody', 'child', 'alimony', 'maintenance', 'adoption', 'separation', 'domestic', 'family', 'spouse', 'partner', 'guardianship', 'prenuptial', 'annulment'],
            specializations: ['Family Law', 'Divorce Law'],
            priority: 1,
            context: ['family disputes', 'marital issues', 'child custody']
        },
        // Property Law Patterns
        {
            keywords: ['property', 'real estate', 'land', 'house', 'apartment', 'rent', 'lease', 'tenant', 'landlord', 'eviction', 'property dispute', 'ownership', 'title', 'deed', 'mortgage', 'construction'],
            specializations: ['Property Law', 'Real Estate Law'],
            priority: 1,
            context: ['property transactions', 'real estate disputes', 'landlord-tenant issues']
        },
        // Employment Law Patterns
        {
            keywords: ['employment', 'job', 'workplace', 'employee', 'employer', 'salary', 'wages', 'termination', 'discrimination', 'harassment', 'labor', 'union', 'contract', 'benefits', 'pension', 'severance'],
            specializations: ['Employment Law', 'Labor Law'],
            priority: 1,
            context: ['employment disputes', 'workplace issues', 'labor relations']
        },
        // Intellectual Property Patterns
        {
            keywords: ['patent', 'trademark', 'copyright', 'intellectual property', 'ip', 'invention', 'brand', 'logo', 'design', 'innovation', 'technology', 'software', 'licensing', 'infringement'],
            specializations: ['Intellectual Property Law', 'Patent Law', 'Trademark Law'],
            priority: 1,
            context: ['ip protection', 'technology law', 'innovation rights']
        },
        // Tax Law Patterns
        {
            keywords: ['tax', 'taxation', 'income tax', 'gst', 'vat', 'audit', 'assessment', 'refund', 'deduction', 'exemption', 'compliance', 'filing', 'returns', 'penalty', 'fine'],
            specializations: ['Tax Law', 'Taxation Law'],
            priority: 1,
            context: ['tax compliance', 'tax disputes', 'tax planning']
        },
        // Immigration Law Patterns
        {
            keywords: ['immigration', 'visa', 'passport', 'citizenship', 'residency', 'work permit', 'green card', 'deportation', 'asylum', 'refugee', 'border', 'migration', 'naturalization'],
            specializations: ['Immigration Law'],
            priority: 1,
            context: ['immigration issues', 'visa applications', 'citizenship matters']
        },
        // Personal Injury Patterns
        {
            keywords: ['injury', 'accident', 'compensation', 'damages', 'liability', 'negligence', 'medical', 'hospital', 'treatment', 'recovery', 'insurance', 'claim', 'settlement', 'lawsuit'],
            specializations: ['Personal Injury Law', 'Accident Law'],
            priority: 1,
            context: ['personal injury claims', 'accident compensation', 'medical negligence']
        },
        // Contract Law Patterns
        {
            keywords: ['contract', 'agreement', 'terms', 'conditions', 'breach', 'violation', 'enforcement', 'performance', 'obligation', 'liability', 'indemnity', 'warranty', 'guarantee'],
            specializations: ['Contract Law', 'Commercial Law'],
            priority: 1,
            context: ['contract disputes', 'agreement enforcement', 'commercial transactions']
        },
        // Banking & Finance Patterns
        {
            keywords: ['banking', 'finance', 'loan', 'credit', 'debt', 'bankruptcy', 'insolvency', 'foreclosure', 'mortgage', 'investment', 'securities', 'regulatory', 'compliance'],
            specializations: ['Banking Law', 'Finance Law', 'Securities Law'],
            priority: 1,
            context: ['financial disputes', 'banking issues', 'regulatory compliance']
        },
        // General Legal Patterns (lower priority)
        {
            keywords: ['legal', 'law', 'advice', 'consultation', 'representation', 'court', 'litigation', 'dispute', 'settlement', 'mediation', 'arbitration'],
            specializations: ['General Legal', 'Litigation'],
            priority: 3,
            context: ['general legal advice', 'legal consultation']
        }
    ];

    /**
     * Find the best matching lawyers based on query analysis
     */
    findMatchingLawyers(query: string): MatchResult[] {
        try {
            // Input validation
            if (!query || typeof query !== 'string' || query.trim().length === 0) {
                console.warn('PatternMatcher: Invalid query provided');
                return this.getFallbackMatches();
            }

            const normalizedQuery = query.toLowerCase().trim();
            const matches: MatchResult[] = [];

            // Analyze query against patterns
            const matchedPatterns = this.analyzeQuery(normalizedQuery);
            
            // If no patterns matched, provide general legal matches
            if (matchedPatterns.length === 0) {
                console.log('PatternMatcher: No specific patterns matched, providing general legal matches');
                return this.getGeneralLegalMatches();
            }
            
            // Find lawyers matching the patterns
            for (const lawyer of allLawyers) {
                try {
                    const matchResult = this.calculateLawyerMatch(lawyer, matchedPatterns, normalizedQuery);
                    if (matchResult.matchScore > 0) {
                        matches.push(matchResult);
                    }
                } catch (error) {
                    console.error('PatternMatcher: Error calculating match for lawyer:', lawyer.name, error);
                    // Continue with other lawyers
                }
            }

            // Ensure we have at least some matches
            if (matches.length === 0) {
                console.log('PatternMatcher: No specific matches found, providing fallback matches');
                return this.getFallbackMatches();
            }

            // Sort by match score and return top matches
            const sortedMatches = matches
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 5);

            console.log(`PatternMatcher: Found ${sortedMatches.length} matches for query: "${query}"`);
            return sortedMatches;

        } catch (error) {
            console.error('PatternMatcher: Critical error in findMatchingLawyers:', error);
            return this.getFallbackMatches();
        }
    }

    /**
     * Analyze query to find matching patterns
     */
    private analyzeQuery(query: string): { pattern: LegalPattern; matchedKeywords: string[] }[] {
        const matchedPatterns: { pattern: LegalPattern; matchedKeywords: string[] }[] = [];

        for (const pattern of this.patterns) {
            const matchedKeywords = pattern.keywords.filter(keyword => 
                query.includes(keyword.toLowerCase())
            );

            if (matchedKeywords.length > 0) {
                matchedPatterns.push({
                    pattern,
                    matchedKeywords
                });
            }
        }

        // Sort by priority and number of matches
        return matchedPatterns.sort((a, b) => {
            if (a.pattern.priority !== b.pattern.priority) {
                return a.pattern.priority - b.pattern.priority;
            }
            return b.matchedKeywords.length - a.matchedKeywords.length;
        });
    }

    /**
     * Calculate match score for a specific lawyer
     */
    private calculateLawyerMatch(
        lawyer: Lawyer, 
        matchedPatterns: { pattern: LegalPattern; matchedKeywords: string[] }[], 
        query: string
    ): MatchResult {
        let totalScore = 0;
        const matchedPatternsList: string[] = [];
        const reasoningParts: string[] = [];

        // Check specialization match
        for (const { pattern, matchedKeywords } of matchedPatterns) {
            const specializationMatch = pattern.specializations.some(spec => 
                lawyer.specialization.toLowerCase().includes(spec.toLowerCase()) ||
                spec.toLowerCase().includes(lawyer.specialization.toLowerCase())
            );

            if (specializationMatch) {
                const baseScore = (100 - pattern.priority * 10) * (matchedKeywords.length / pattern.keywords.length);
                totalScore += baseScore;
                matchedPatternsList.push(pattern.specializations[0]);
                reasoningParts.push(`Specializes in ${pattern.specializations[0]} (${matchedKeywords.length} keyword matches)`);
            }
        }

        // Bonus for exact specialization match
        const exactSpecializationMatch = matchedPatterns.some(({ pattern }) => 
            pattern.specializations.some(spec => 
                spec.toLowerCase() === lawyer.specialization.toLowerCase()
            )
        );

        if (exactSpecializationMatch) {
            totalScore += 20;
            reasoningParts.push('Exact specialization match');
        }

        // Bonus for high-rated lawyers
        if (lawyer.rating >= 4.5) {
            totalScore += 10;
            reasoningParts.push('Highly rated lawyer');
        }

        // Bonus for experienced lawyers
        if (lawyer.yearsOfPractice && lawyer.yearsOfPractice >= 10) {
            totalScore += 5;
            reasoningParts.push('Extensive experience');
        }

        // Bonus for relevant achievements
        if (lawyer.achievements && lawyer.achievements.length > 0) {
            const relevantAchievements = lawyer.achievements.filter(achievement => 
                matchedPatterns.some(({ pattern }) => 
                    pattern.specializations.some(spec => 
                        achievement.toLowerCase().includes(spec.toLowerCase())
                    )
                )
            );
            
            if (relevantAchievements.length > 0) {
                totalScore += 15;
                reasoningParts.push(`Recognized expert (${relevantAchievements[0]})`);
            }
        }

        // Cap the score at 100
        const finalScore = Math.min(100, Math.round(totalScore));

        return {
            lawyer,
            matchScore: finalScore,
            matchedPatterns: matchedPatternsList,
            reasoning: reasoningParts.join(' • ')
        };
    }

    /**
     * Get pattern insights for debugging (not exposed to user)
     */
    getPatternInsights(query: string): {
        detectedPatterns: string[];
        confidence: number;
        reasoning: string;
    } {
        try {
            if (!query || typeof query !== 'string') {
                return {
                    detectedPatterns: ['General Legal'],
                    confidence: 50,
                    reasoning: 'No valid query provided'
                };
            }

            const normalizedQuery = query.toLowerCase();
            const matchedPatterns = this.analyzeQuery(normalizedQuery);
            
            return {
                detectedPatterns: matchedPatterns.map(({ pattern }) => pattern.specializations[0]),
                confidence: Math.min(100, matchedPatterns.length * 20),
                reasoning: `Detected ${matchedPatterns.length} legal pattern(s) in query`
            };
        } catch (error) {
            console.error('PatternMatcher: Error in getPatternInsights:', error);
            return {
                detectedPatterns: ['General Legal'],
                confidence: 50,
                reasoning: 'Pattern analysis failed, using general legal approach'
            };
        }
    }

    /**
     * Get fallback matches when pattern matching fails
     */
    private getFallbackMatches(): MatchResult[] {
        try {
            // Return top-rated lawyers as fallback
            const topLawyers = allLawyers
                .filter(lawyer => lawyer.rating >= 4.0)
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 3);

            return topLawyers.map((lawyer, index) => ({
                lawyer,
                matchScore: 60 - (index * 10), // Decreasing scores
                matchedPatterns: ['General Legal'],
                reasoning: `Highly rated lawyer (${lawyer.rating}/5 stars) - General legal expertise`
            }));
        } catch (error) {
            console.error('PatternMatcher: Error in getFallbackMatches:', error);
            return [];
        }
    }

    /**
     * Get general legal matches when no specific patterns are found
     */
    private getGeneralLegalMatches(): MatchResult[] {
        try {
            // Return lawyers with general legal expertise
            const generalLawyers = allLawyers
                .filter(lawyer => 
                    lawyer.specialization.toLowerCase().includes('general') ||
                    lawyer.specialization.toLowerCase().includes('litigation') ||
                    lawyer.rating >= 4.5
                )
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 5);

            return generalLawyers.map((lawyer, index) => ({
                lawyer,
                matchScore: 70 - (index * 8),
                matchedPatterns: ['General Legal'],
                reasoning: `General legal expertise - ${lawyer.specialization} (${lawyer.rating}/5 stars)`
            }));
        } catch (error) {
            console.error('PatternMatcher: Error in getGeneralLegalMatches:', error);
            return this.getFallbackMatches();
        }
    }
}
