import React, { useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, MultiValue } from 'react-select';
import Fuse from 'fuse.js';

interface TagInputProps {
  value: string[];
  onChange: (newTags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  maxTags?: number;
  label?: string;
  className?: string;
}

interface Option {
  label: string;
  value: string;
}

const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  suggestions,
  placeholder = 'Type to add...',
  maxTags = 10,
  label,
  className = ''
}) => {
  // Convert current tags to react-select format
  const selectedOptions = value.map(tag => ({ label: tag, value: tag }));

  // Setup fuzzy search with Fuse.js
  const fuse = useMemo(() => new Fuse(suggestions, {
    keys: ['label'],
    threshold: 0.3,
    distance: 100
  }), [suggestions]);

  // Custom filter function that uses fuzzy search
  const filterOptions = (inputValue: string) => {
    if (!inputValue) {
      return suggestions.map(tag => ({ label: tag, value: tag }));
    }

    // Get fuzzy search results
    const results = fuse.search(inputValue);
    
    // Filter out already selected tags
    return results
      .map(result => ({ label: result.item, value: result.item }))
      .filter(option => !value.includes(option.value))
      .slice(0, 10); // Limit to 10 suggestions
  };

  const handleChange = (
    newValue: MultiValue<Option>,
    actionMeta: ActionMeta<Option>
  ) => {
    const newTags = newValue.map(option => option.value);
    onChange(newTags);
  };

  const handleCreate = (inputValue: string) => {
    const trimmedValue = inputValue.trim();
    
    // Basic validation
    if (trimmedValue.length < 2) {
      alert('Tags must be at least 2 characters long');
      return;
    }
    
    if (trimmedValue.length > 20) {
      alert('Tags cannot be longer than 20 characters');
      return;
    }

    if (value.length >= maxTags) {
      alert(`Maximum of ${maxTags} tags allowed`);
      return;
    }

    // Check for duplicates (case-insensitive)
    if (value.some(tag => tag.toLowerCase() === trimmedValue.toLowerCase())) {
      alert('This tag has already been added');
      return;
    }

    onChange([...value, trimmedValue]);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <CreatableSelect<Option, true>
        isMulti
        options={filterOptions('')}
        value={selectedOptions}
        onChange={handleChange}
        onCreateOption={handleCreate}
        placeholder={placeholder}
        className="react-select-container"
        classNamePrefix="react-select"
        formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
        noOptionsMessage={({ inputValue }) => 
          inputValue ? 'No matching suggestions' : 'Start typing to see suggestions'
        }
        maxMenuHeight={200}
        menuPlacement="auto"
        onInputChange={(newValue, actionMeta) => {
          return newValue;
        }}
        styles={{
          control: (base) => ({
            ...base,
            borderColor: '#D1D5DB',
            '&:hover': {
              borderColor: '#9CA3AF'
            }
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: '#E5E7EB',
            borderRadius: '9999px'
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: '#374151',
            padding: '2px 8px'
          }),
          multiValueRemove: (base) => ({
            ...base,
            color: '#4B5563',
            ':hover': {
              backgroundColor: '#D1D5DB',
              color: '#1F2937'
            }
          })
        }}
      />
    </div>
  );
};

export default TagInput; 