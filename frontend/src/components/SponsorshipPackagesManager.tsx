import React, { useState, useEffect } from 'react';
import { sponsorApi } from '../services/sponsor.service';
import { 
  SponsorshipPackage, 
  CreateSponsorshipPackageDto, 
  UpdateSponsorshipPackageDto,
  SponsorshipTypeItem,
  PackageSponsorshipType
} from '../types/sponsor';
import { LoadingSpinner } from './LoadingSpinner';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  DocumentDuplicateIcon,
  SparklesIcon,
  GiftIcon,
  CheckIcon,
  BuildingOfficeIcon,
  GiftTopIcon,
  TicketIcon,
  CurrencyDollarIcon,
  MegaphoneIcon,
  MusicalNoteIcon,
  UserGroupIcon,
  BanknotesIcon,
  CreditCardIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

interface Props {
  sponsorUsername: string;
  isOwner: boolean;
}

// Sponsorship type descriptions with icons
const SPONSORSHIP_TYPE_INFO = {
  [PackageSponsorshipType.LOCATION_HOSTING]: {
    icon: BuildingOfficeIcon,
    label: 'Location Hosting',
    description: 'Provide venue or space for events'
  },
  [PackageSponsorshipType.PRODUCT_SAMPLES_SWAG]: {
    icon: GiftTopIcon,
    label: 'Product Samples & Swag',
    description: 'Offer product samples or branded merchandise'
  },
  [PackageSponsorshipType.RAFFLE_GIVEAWAY_DONATION]: {
    icon: TicketIcon,
    label: 'Raffle & Giveaway',
    description: 'Donate items for raffles and giveaways'
  },
  [PackageSponsorshipType.BUSINESS_PRODUCT_SERVICE_DISCOUNT]: {
    icon: CurrencyDollarIcon,
    label: 'Business Discounts',
    description: 'Special discounts for club members'
  },
  [PackageSponsorshipType.EVENT_PROMOTION]: {
    icon: MegaphoneIcon,
    label: 'Event Promotion',
    description: 'Help promote club events'
  },
  [PackageSponsorshipType.ENTERTAINMENT]: {
    icon: MusicalNoteIcon,
    label: 'Entertainment',
    description: 'Provide entertainment for events'
  },
  [PackageSponsorshipType.EVENT_STAFFING_SUPPORT]: {
    icon: UserGroupIcon,
    label: 'Event Staffing',
    description: 'Support with event staff and volunteers'
  },
  [PackageSponsorshipType.MONETARY_CLUB_DONATION]: {
    icon: BanknotesIcon,
    label: 'Monetary Donation',
    description: 'Financial support for the club'
  },
  [PackageSponsorshipType.ORGANIZER_BUSINESS_CREDIT]: {
    icon: CreditCardIcon,
    label: 'Business Credit',
    description: 'Credit for business services'
  },
  [PackageSponsorshipType.CUSTOM_SPONSORSHIP]: {
    icon: WrenchScrewdriverIcon,
    label: 'Custom Sponsorship',
    description: 'Custom sponsorship arrangement'
  }
};

const SponsorshipPackagesManager: React.FC<Props> = ({ sponsorUsername, isOwner }) => {
  const [packages, setPackages] = useState<SponsorshipPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<SponsorshipPackage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    packageName: '',
    packageDescription: '',
    sponsorshipTypes: Object.values(PackageSponsorshipType).map(type => ({
      type,
      isSelected: false,
      customDescription: ''
    })),
    isFeatured: false
  });

  const allSponsorshipTypes = Object.values(PackageSponsorshipType);

  useEffect(() => {
    fetchPackages();
  }, [sponsorUsername]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await sponsorApi.getSponsorshipPackages(sponsorUsername);
      setPackages(response);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      toast.error('Failed to load sponsorship packages');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: SponsorshipPackage) => {
    setEditingPackage(pkg);
    setFormData({
      packageName: pkg.packageName,
      packageDescription: pkg.packageDescription || '',
      sponsorshipTypes: Object.values(PackageSponsorshipType).map(type => {
        const existing = pkg.sponsorshipTypes.find(item => item.type === type);
        return {
          type,
          isSelected: existing?.isSelected || false,
          customDescription: existing?.customDescription || ''
        };
      }),
      isFeatured: pkg.isFeatured
    });
    setShowForm(true);
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    
    try {
      await sponsorApi.deleteSponsorshipPackage(packageId);
      toast.success('Package deleted successfully');
      fetchPackages();
    } catch (error) {
      console.error('Failed to delete package:', error);
      toast.error('Failed to delete package');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedTypes = formData.sponsorshipTypes.filter(type => type.isSelected);
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one sponsorship type');
      return;
    }

    try {
      if (editingPackage) {
        await sponsorApi.updateSponsorshipPackage(editingPackage._id, {
          packageName: formData.packageName,
          packageDescription: formData.packageDescription,
          sponsorshipTypes: formData.sponsorshipTypes,
          isFeatured: formData.isFeatured
        });
        toast.success('Package updated successfully');
      } else {
        await sponsorApi.createSponsorshipPackage(sponsorUsername, formData);
        toast.success('Package created successfully');
      }
      
      setShowForm(false);
      setEditingPackage(null);
      setFormData({
        packageName: '',
        packageDescription: '',
        sponsorshipTypes: Object.values(PackageSponsorshipType).map(type => ({
          type,
          isSelected: false,
          customDescription: ''
        })),
        isFeatured: false
      });
      fetchPackages();
    } catch (error: any) {
      console.error('Failed to save package:', error);
      toast.error('Failed to save package');
    }
  };

  const handleTypeToggle = (type: PackageSponsorshipType) => {
    setFormData(prev => ({
      ...prev,
      sponsorshipTypes: prev.sponsorshipTypes.map(item => 
        item.type === type ? { ...item, isSelected: !item.isSelected } : item
      )
    }));
  };

  const handleCustomDescriptionChange = (type: PackageSponsorshipType, value: string) => {
    setFormData(prev => ({
      ...prev,
      sponsorshipTypes: prev.sponsorshipTypes.map(item => 
        item.type === type ? { ...item, customDescription: value } : item
      )
    }));
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Sponsorship Packages
        </h2>
        {isOwner && (
          <button
            onClick={() => {
              setEditingPackage(null);
              setFormData({
                packageName: '',
                packageDescription: '',
                sponsorshipTypes: Object.values(PackageSponsorshipType).map(type => ({
                  type,
                  isSelected: false,
                  customDescription: ''
                })),
                isFeatured: false
              });
              setShowForm(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create Package
          </button>
        )}
      </div>

      <div className="space-y-6">
        {packages.map((pkg) => (
          <div
            key={pkg._id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden relative group w-full"
          >
            {/* Package Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {pkg.packageName}
                  {pkg.isFeatured && (
                    <SparklesIcon className="h-5 w-5 text-yellow-500" title="Featured Package" />
                  )}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {pkg.packageDescription}
                </p>
              </div>
              {isOwner && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(pkg)}
                    className="p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                    title="Edit Package"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(pkg._id)}
                    className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                    title="Delete Package"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Sponsorship Types Grid */}
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Object.entries(SPONSORSHIP_TYPE_INFO).map(([type, info]) => {
                  const sponsorshipType = type as PackageSponsorshipType;
                  const isSelected = pkg.sponsorshipTypes.some(item => item.type === sponsorshipType && item.isSelected);
                  const Icon = info.icon;
                  
                  if (!isSelected) return null;

                  const typeData = pkg.sponsorshipTypes.find(item => item.type === sponsorshipType);
                  const customDescription = typeData?.customDescription;

                  return (
                    <div
                      key={type}
                      className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      title={customDescription || info.description}
                    >
                      <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white mt-2 text-center">
                        {info.label}
                      </span>
                      {customDescription && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center line-clamp-2">
                          {customDescription}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {packages.length === 0 && (
        <div className="text-center py-12">
          <GiftIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No packages</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isOwner ? 'Get started by creating a new sponsorship package.' : 'No sponsorship packages available yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default SponsorshipPackagesManager; 