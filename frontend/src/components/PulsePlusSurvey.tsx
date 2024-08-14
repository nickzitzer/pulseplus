import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';

interface SurveyQuestion {
  sys_id: string;
  text: string;
  type: 'multiple_choice' | 'rating' | 'text';
  options?: string[];
}

const PulsePlusSurvey: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string | number }>({});
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  useEffect(() => {
    const fetchSurveyQuestions = async () => {
      try {
        const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/survey-questions`);
        if (!response.ok) {
          throw new Error('Failed to fetch survey questions');
        }
        const data = await response.json();
        setQuestions(data);
      } catch (error) {
        console.error('Error fetching survey questions:', error);
        setError('Failed to load survey questions. Please try again later.');
      }
    };

    if (isOpen) {
      fetchSurveyQuestions();
    }
  }, [isOpen, fetchWithAuth]);

  

  const handleAnswer = (answer: string | number) => {
    setAnswers({ ...answers, [questions[currentQuestionIndex].sys_id]: answer });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitSurvey();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitSurvey = async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/survey-responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answers),
      });

      if (!response.ok) {
        throw new Error('Failed to submit survey');
      }

      // Reset the survey state
      setIsOpen(false);
      setCurrentQuestionIndex(0);
      setAnswers({});
      
      // You might want to show a success message here
      alert('Survey submitted successfully!');
    } catch (error) {
      console.error('Error submitting survey:', error);
      setError('Failed to submit survey. Please try again.');
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="fixed bottom-20 left-4" style={{ zIndex: 999999999 }}>
      {isOpen ? (
        <div className="bg-white shadow-lg rounded-lg w-80 p-4">
          <h2 className="text-xl font-bold mb-4">Gamification Feedback</h2>
          {currentQuestion && (
            <div className="mb-4">
              <p className="font-semibold mb-2">{currentQuestion.text}</p>
              {currentQuestion.type === 'rating' && (
                <div className="flex justify-between">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      className={`w-10 h-10 rounded-full ${
                        answers[currentQuestion.sys_id] === rating ? 'bg-sky-400 text-white' : 'bg-gray-200'
                      }`}
                      onClick={() => handleAnswer(rating)}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              )}
              {currentQuestion.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {currentQuestion.options?.map((option) => (
                    <button
                      key={option}
                      className={`w-full p-2 text-left rounded ${
                        answers[currentQuestion.sys_id] === option ? 'bg-sky-400 text-white' : 'bg-gray-200'
                      }`}
                      onClick={() => handleAnswer(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {currentQuestion.type === 'text' && (
                <textarea
                  className="w-full p-2 border rounded"
                  rows={3}
                  value={answers[currentQuestion.sys_id] as string || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                />
              )}
            </div>
          )}
          <div className="flex justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center text-sky-400 disabled:text-gray-400"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </button>
            <button
              onClick={nextQuestion}
              className="flex items-center text-sky-400"
            >
              {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-sky-400 text-white py-2 px-4 rounded-full shadow-lg hover:bg-sky-700 transition-colors"
        >
          Feedback
        </button>
      )}
    </div>
  );
};

export default PulsePlusSurvey;