import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Target } from "lucide-react";
import PulsePlusProgressBar from "./PulsePlusProgressBar";
import api from '@/utils/api';
import { useFetch } from '@/utils/useFetch';
import { formatDate, formatProgress } from '@/utils/formatters';
import Image from '@/components/ui/PulsePlusImage';
import imageLoader, { ImageLoaderOptions } from '@/utils/imageLoaderUtil';

interface PulsePlusGoalsProps {
  gameId: string | undefined;
}

interface Goal {
  sys_id: string;
  name: string;
  description: string;
  target: number;
  value: number;
  image_url: string;
  color: string;
  recurring: string;
}

const PulsePlusGoals: React.FC<PulsePlusGoalsProps> = ({ gameId }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    const fetchGoals = async (gameId: string) => {
      try {
        const response = await api.get(`/goals?game=${gameId}`);
        if (response.status !== 200) {
          throw new Error("Failed to fetch goals");
        }
        const data = response.data;
        setGoals(data);
        // Open the first category by default
        if (data.length > 0) {
          setOpenCategories([data[0].recurring]);
        }
      } catch (error) {
        console.error("Error fetching goals:", error);
        setError("Failed to load goals. Please try again later.");
      }
    };

    if (gameId) {
      fetchGoals(gameId);
    }
  }, [gameId]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const categories = Array.from(new Set(goals.map((goal) => goal.recurring)));

  return (
    <div className="pulseplus-goals space-y-4">
      {categories.map((category) => (
        <div
          key={category}
          className="bg-white shadow rounded-lg overflow-hidden"
        >
          <button
            className="w-full p-4 text-left font-bold flex justify-between items-center"
            onClick={() => toggleCategory(category)}
          >
            {category} Goals
            {openCategories.includes(category) ? (
              <ChevronUp />
            ) : (
              <ChevronDown />
            )}
          </button>
          {openCategories.includes(category) && (
            <div className="p-4 space-y-4">
              {goals
                .filter((goal) => goal.recurring === category)
                .map((goal) => (
                  <div key={goal.sys_id} className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      {goal.image_url ? (
                        <Image
                          src={goal.image_url}
                          alt={goal.name}
                          width={32}
                          height={32}
                          loader={({ src, width, quality }) => imageLoader({ src, width, quality, type: 'image' })}
                          className="mr-2 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.nextElementSibling?.classList.remove(
                              "hidden"
                            );
                          }}
                        />
                      ) : (
                        <Target
                          className={`w-8 h-8 mr-2`}
                          color={goal.color || "#000000"}
                        />
                      )}

                      <h3 className="font-bold">{goal.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {goal.description}
                    </p>
                    <PulsePlusProgressBar
                      min={0}
                      max={goal.target}
                      value={goal.value}
                      goal={goal.target}
                      unit="units"
                      type="bar"
                      title={goal.name}
                      colorStart={goal.color}
                      colorFinish={goal.color}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PulsePlusGoals;