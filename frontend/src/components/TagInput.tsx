import React, { useState, useMemo, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, MultiValue } from 'react-select';

interface TagOption {
  label: string;
  value: string;
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Add tags...',
  maxTags = 10,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();
    
    // Create observer to watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Convert tags to options format
  const selectedOptions = useMemo(
    () => value.map(tag => ({ label: tag, value: tag })),
    [value]
  );

  // Create suggestion options, filtering out already selected
  const suggestionOptions = useMemo(
    () => suggestions
      .filter(suggestion => !value.includes(suggestion))
      .map(suggestion => ({ label: suggestion, value: suggestion })),
    [suggestions, value]
  );

  // Filter suggestions based on input
  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) return suggestionOptions.slice(0, 10);
    
    return suggestionOptions
      .filter(option => 
        option.label.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 10);
  }, [suggestionOptions, inputValue]);

  const handleChange = (newValue: MultiValue<TagOption>, _actionMeta: ActionMeta<TagOption>) => {
    const newTags = newValue.map(option => option.value);
    onChange(newTags);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
  };

  const handleCreateOption = (inputValue: string) => {
    const trimmedValue = inputValue.trim();
    
    if (!trimmedValue) return;

    if (value.length >= maxTags) {
      alert(`Maximum of ${maxTags} tags allowed`);
      return;
    }

    if (value.some(tag => tag.toLowerCase() === trimmedValue.toLowerCase())) {
      alert('This tag has already been added');
      return;
    }

    onChange([...value, trimmedValue]);
    setInputValue('');
  };

  // Theme-aware styles
  const getStyles = () => ({
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: isDarkMode ? '#374151' : '#ffffff',
      borderColor: state.isFocused 
        ? (isDarkMode ? '#60a5fa' : '#3b82f6')
        : (isDarkMode ? '#4b5563' : '#d1d5db'),
      boxShadow: state.isFocused 
        ? `0 0 0 1px ${isDarkMode ? '#60a5fa' : '#3b82f6'}` 
        : 'none',
      '&:hover': {
        borderColor: isDarkMode ? '#60a5fa' : '#3b82f6',
      },
      color: isDarkMode ? '#f9fafb' : '#111827',
      minHeight: '38px',
    }),
    input: (base: any) => ({
      ...base,
      color: isDarkMode ? '#f9fafb' : '#111827',
    }),
    placeholder: (base: any) => ({
      ...base,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    }),
    singleValue: (base: any) => ({
      ...base,
      color: isDarkMode ? '#f9fafb' : '#111827',
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: isDarkMode ? '#1f2937' : '#eff6ff',
      borderRadius: '6px',
      border: isDarkMode ? '1px solid #374151' : 'none',
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: isDarkMode ? '#93c5fd' : '#1e40af',
      fontWeight: '500',
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      '&:hover': {
        backgroundColor: isDarkMode ? '#dc2626' : '#fecaca',
        color: isDarkMode ? '#fef2f2' : '#dc2626',
      },
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? (isDarkMode ? '#1d4ed8' : '#3b82f6')
        : state.isFocused 
          ? (isDarkMode ? '#374151' : '#eff6ff')
          : (isDarkMode ? '#1f2937' : '#ffffff'),
      color: state.isSelected 
        ? '#ffffff' 
        : (isDarkMode ? '#f9fafb' : '#374151'),
      '&:active': {
        backgroundColor: isDarkMode ? '#4b5563' : '#dbeafe',
      },
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
      boxShadow: isDarkMode 
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
        : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      zIndex: 50,
    }),
    menuList: (base: any) => ({
      ...base,
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
    }),
    noOptionsMessage: (base: any) => ({
      ...base,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    }),
    loadingMessage: (base: any) => ({
      ...base,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    }),
  });

  return (
    <div className={`tag-input ${className}`}>
      <CreatableSelect
        isMulti
        value={selectedOptions}
        onChange={handleChange}
        onCreateOption={handleCreateOption}
        onInputChange={handleInputChange}
        inputValue={inputValue}
        options={filteredOptions}
        placeholder={placeholder}
        isClearable={false}
        isSearchable={true}
        createOptionPosition="first"
        formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
        noOptionsMessage={({ inputValue }) => 
          inputValue ? `No matching tags for "${inputValue}"` : 'Start typing to search tags...'
        }
        classNamePrefix="react-select"
        maxMenuHeight={200}
        menuPlacement="auto"
        styles={getStyles()}
      />
      {value.length > 0 && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors">
          {value.length}/{maxTags} tags used
        </div>
      )}
    </div>
  );
};

export default TagInput; 