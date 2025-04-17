'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/use-auth';
import { useLevelRequirements } from '../../hooks/use-level-requirements';
import { CheckCircle, Lock } from 'lucide-react';
import { Badge } from '../ui/badge';
import { NFT_CONTRACT_ADDRESS } from '../../lib/nft/erc721-integration';
import { ZoraMintButton } from '../nft/zora-mint-button';

// Science NFT data
const scienceNFTs = [
  {
    id: 'science-nft-1',
    name: 'Research Hypothesis',
    description: 'The core scientific hypothesis that forms the foundation of your research.',
    type: 'research' as const,
    imageUrl: 'https://via.placeholder.com/300/8bff2a/FFFFFF?text=Hypothesis',
  },
  {
    id: 'science-nft-2',
    name: 'Methodology Design',
    description: 'The experimental approach and methodologies used in your research.',
    type: 'research' as const,
    imageUrl: 'https://via.placeholder.com/300/8bff2a/FFFFFF?text=Methodology',
  },
  {
    id: 'science-nft-3',
    name: 'Theoretical Model',
    description: 'The theoretical framework that supports your scientific inquiry.',
    type: 'vision' as const,
    imageUrl: 'https://via.placeholder.com/300/8bff2a/FFFFFF?text=Theory',
  },
];

export function Level1NFTGallery() {
  const { user } = useAuth();
  const { markRequirementComplete, requirements } = useLevelRequirements();
  const [mintedNFTs, setMintedNFTs] = useState<
    Record<string, { tokenId?: string; txHash: string }>
  >({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing minted NFTs when component mounts
  useEffect(() => {
    const checkExistingMintedNFTs = async () => {
      if (!user?.id) return;

      setIsLoading(true);

      try {
        // In a real implementation, you would fetch existing tokens from your backend
        // or use a blockchain indexer to check if this user has minted NFTs from your contract

        // For now, we'll simulate this check with a timeout
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock already minted NFTs (in a real app, you'd query your database or the blockchain)
        const existingMinted: Record<string, { tokenId?: string; txHash: string }> = {};

        // Typically you would check locally stored NFTs or query a subgraph/indexer
        // For mock purposes, we'll check localStorage to simulate persisting mint state
        try {
          const storedNFTs = localStorage.getItem(`minted-nfts-${user.id}`);
          if (storedNFTs) {
            const parsed = JSON.parse(storedNFTs);
            Object.assign(existingMinted, parsed);
          }
        } catch (e) {
          console.error('Error reading from localStorage:', e);
        }

        // Update state with any existing minted NFTs
        if (Object.keys(existingMinted).length > 0) {
          setMintedNFTs(existingMinted);
        }
      } catch (error) {
        console.error('Error checking existing minted NFTs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingMintedNFTs();
  }, [user?.id]);

  // Check if requirement is already completed when component mounts
  useEffect(() => {
    const requirementCompleted = requirements?.find((r) =>
      r.requirement.includes('Mint 3 Science NFTs')
    )?.completed;
    if (requirementCompleted) {
      setIsCompleted(true);
    }
  }, [requirements]);

  // Check if all NFTs are minted and update requirement status
  useEffect(() => {
    const checkAllMinted = async () => {
      if (!user?.id) return;

      // Count minted NFTs
      const mintedCount = Object.keys(mintedNFTs).length;

      // Store minted NFTs in localStorage to simulate persistence
      try {
        localStorage.setItem(`minted-nfts-${user.id}`, JSON.stringify(mintedNFTs));
      } catch (e) {
        console.error('Error storing in localStorage:', e);
      }

      // Check if all 3 NFTs are minted and requirement isn't already completed
      if (mintedCount === 3 && !isCompleted) {
        console.log('All 3 NFTs minted, marking requirement as complete');
        try {
          await markRequirementComplete('Mint 3 Science NFTs');
          setIsCompleted(true);
        } catch (error) {
          console.error('Error marking requirement complete:', error);
        }
      }
    };

    checkAllMinted();
  }, [mintedNFTs, user?.id, markRequirementComplete, isCompleted]);

  const handleMintSuccess = (
    nftId: string,
    data: { transactionHash: string; tokenId?: string }
  ) => {
    // Update the mintedNFTs state with the new NFT
    setMintedNFTs((prev) => ({
      ...prev,
      [nftId]: {
        tokenId: data.tokenId,
        txHash: data.transactionHash,
      },
    }));
  };

  const mintedCount = Object.keys(mintedNFTs).length;
  const allMinted = mintedCount === 3;

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg">
        <h2 className="text-lg font-medium mb-2">Level 1: Document Your Science</h2>
        <p className="text-sm text-muted-foreground">
          Mint 3 Science NFTs to document your scientific ideas and advance to Level 2.
        </p>
        <div className="mt-2 text-xs text-muted-foreground">
          <span>Contract: </span>
          <a
            href={`https://sepolia.basescan.org/address/${NFT_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            {NFT_CONTRACT_ADDRESS.substring(0, 6)}...
            {NFT_CONTRACT_ADDRESS.substring(NFT_CONTRACT_ADDRESS.length - 4)}
          </a>
          <span> (Base Sepolia)</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Mint Your Science NFTs</h3>
        <Badge variant={mintedCount === 3 ? 'default' : 'outline'}>{mintedCount}/3 Minted</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-[300px] w-full flex flex-col items-center justify-center">
            <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Checking for existing NFTs...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scienceNFTs.map((nft) => {
            const isMinted = nft.id in mintedNFTs;
            const mintedData = mintedNFTs[nft.id];

            return (
              <Card key={nft.id} className={isMinted ? 'border-green-500' : ''}>
                <div className="relative">
                  <img
                    src={nft.imageUrl}
                    alt={nft.name}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                  {isMinted && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{nft.name}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {nft.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{nft.description}</CardDescription>

                  {isMinted && mintedData && (
                    <div className="mt-2 mb-4 text-xs text-muted-foreground space-y-1">
                      {mintedData.tokenId && (
                        <div className="flex items-center">
                          <span className="font-medium mr-1">Token ID:</span>
                          <span>{mintedData.tokenId}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="font-medium mr-1">Tx:</span>
                        <a
                          href={`https://sepolia.basescan.org/tx/${mintedData.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate max-w-[150px]"
                        >
                          {mintedData.txHash.substring(0, 10)}...
                        </a>
                      </div>
                    </div>
                  )}

                  <ZoraMintButton
                    fullWidth
                    mintType="1155"
                    nftName={nft.name}
                    comment={`${nft.name} - ${nft.type} NFT for BioDAO`}
                    onMintSuccess={(data) => handleMintSuccess(nft.id, data)}
                    variant={isMinted ? 'outline' : 'default'}
                    size="sm"
                    disabled={isMinted}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {allMinted && (
        <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-green-800">
          <h3 className="font-medium flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Congratulations!
          </h3>
          <p className="mt-1">You've minted all 3 Science NFTs! You've now unlocked Level 2.</p>
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
            {isCompleted || allMinted ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-medium">
              {isCompleted || allMinted ? 'Level 2 Unlocked!' : 'Level 2 Locked'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isCompleted || allMinted
                ? 'You can now access Level 2: Community Builder'
                : `Mint ${3 - mintedCount} more NFTs to unlock Community Builder level`}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">{mintedCount}/3 minted</div>
      </div>
    </div>
  );
}

export function ProjectDescriptionForm() {
  const [description, setDescription] = useState('');
  const { user } = useAuth();
  const { markRequirementComplete } = useLevelRequirements();

  const handleSubmit = async () => {
    if (!description.trim() || !user?.id) return;

    try {
      // Here you would normally save the project description to your database
      console.log('Saving project description:', description);

      // Mark the requirement as complete
      await markRequirementComplete('Complete project description');

      // Reset form or show success message
      setDescription('');
      alert('Project description saved successfully!');
    } catch (error) {
      console.error('Error saving project description:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>Project Description</CardTitle>
        <CardDescription>
          Describe your bio project in detail to unlock the next level
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Describe your project..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[150px] mb-4"
        />
        <Button onClick={handleSubmit}>Save Project Description</Button>
      </CardContent>
    </Card>
  );
}

export function ScientificReferencesForm() {
  const [references, setReferences] = useState(['', '', '']);
  const { user } = useAuth();
  const { markRequirementComplete } = useLevelRequirements();

  const handleReferenceChange = (index: number, value: string) => {
    const newReferences = [...references];
    newReferences[index] = value;
    setReferences(newReferences);
  };

  const handleSubmit = async () => {
    if (references.some((ref) => !ref.trim()) || !user?.id) return;

    try {
      // Here you would normally save the references to your database
      console.log('Saving scientific references:', references);

      // Mark the requirement as complete
      await markRequirementComplete('Provide 3 scientific references');

      // Reset form or show success message
      alert('Scientific references saved successfully!');
    } catch (error) {
      console.error('Error saving scientific references:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Scientific References</CardTitle>
        <CardDescription>
          Provide three scientific references relevant to your project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {references.map((reference, index) => (
            <Textarea
              key={index}
              placeholder={`Reference ${index + 1}`}
              value={reference}
              onChange={(e) => handleReferenceChange(index, e.target.value)}
              className="min-h-[80px]"
            />
          ))}
          <Button onClick={handleSubmit}>Save References</Button>
        </div>
      </CardContent>
    </Card>
  );
}
