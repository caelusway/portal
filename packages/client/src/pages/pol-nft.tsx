'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '../lib/use-auth';
import { useToast } from '../hooks/use-toast';
import { useWallets, ConnectedWallet } from '@privy-io/react-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Upload,
  FileText,
  Video,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle,
  Award,
  Brain,
  Zap,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  mintPOLNFT,
  createPOLComment,
  publicClient,
  submitPOLProof,
  ZORA_CONTRACT_ADDRESS,
} from '../lib/nft-actions';
import type { Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { useDatabase, type POLResult } from '../contexts/db-context';

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  type: 'document' | 'video' | 'image';
}

interface MintedPOLNFT {
  transactionHash: string;
  polData: POLResult;
  poiTransactionHash?: string; // Blockchain proof transaction
  mintedAt: string;
}

export default function POLNFTPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { wallets } = useWallets();
  const { generatePOL } = useDatabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isGeneratingPOL, setIsGeneratingPOL] = useState(false);
  const [isMintingNFT, setIsMintingNFT] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [polResult, setPOLResult] = useState<POLResult | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [mintedNFT, setMintedNFT] = useState<MintedPOLNFT | null>(null);

  // Get embedded wallet
  const embeddedWallet = wallets.find(
    (wallet: ConnectedWallet) => wallet.walletClientType === 'privy'
  );

  // File handling
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const processFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => {
      const id = Math.random().toString(36).substring(2, 15);
      let type: 'document' | 'video' | 'image' = 'document';

      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('image/')) type = 'image';

      const uploadedFile: UploadedFile = { file, id, type };

      // Create preview for images
      if (type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, preview: e.target?.result as string } : f))
          );
        };
        reader.readAsDataURL(file);
      }

      return uploadedFile;
    });

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return <Video className="h-8 w-8 text-blue-500" />;
    if (type.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-green-500" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  // POL Generation using the database context
  const handleGeneratePOL = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: 'No Files Selected',
        description: 'Please upload at least one Invention material.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingPOL(true);

    try {
      // Extract files from uploaded files
      const files = uploadedFiles.map(({ file }) => file);

      // Use the database context method
      const result = await generatePOL(files);

      setPOLResult(result);
      setActiveTab('mint');
      toast({
        title: 'POL Generated Successfully!',
        description: 'Your Invention proof has been generated. Ready to mint your NFT!',
      });
    } catch (error: any) {
      console.error('POL Generation Error:', error);
      toast({
        title: 'POL Generation Failed',
        description: error.message || 'Failed to generate proof of Invention.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPOL(false);
    }
  };

  // Submit proof to blockchain and mint NFT
  const handleMintPOLNFT = async () => {
    if (!polResult || !embeddedWallet) {
      toast({
        title: 'Missing Requirements',
        description: 'Please generate POL first and ensure wallet is connected.',
        variant: 'destructive',
      });
      return;
    }

    setIsMintingNFT(true);
    let poiTransactionHash: string | undefined;

    try {
      // Option 1: Submit POI proof to blockchain (optional but recommended)
      // Option 2: Just mint commemorative NFT

      // For now, let's just mint the commemorative NFT with the merkle root
      toast({
        title: 'Minting POL NFT',
        description: 'Creating your commemorative Proof of Invention NFT...',
      });

      // Mint the commemorative POL NFT using Zora contract
      const nftTransactionHash = await mintPOLNFT(
        embeddedWallet.address as Hex,
        polResult.merkleRoot as Hex
      );

      // Wait for NFT transaction confirmation
      const nftReceipt = await publicClient.waitForTransactionReceipt({
        hash: nftTransactionHash,
        timeout: 120_000,
      });

      // Store the minted NFT data
      const mintedNFTData: MintedPOLNFT = {
        transactionHash: nftTransactionHash,
        polData: polResult,
        poiTransactionHash, // Will be undefined since we skipped it
        mintedAt: new Date().toISOString(),
      };

      setMintedNFT(mintedNFTData);

      // Save to local storage for persistence
      const existingPOLNFTs = JSON.parse(localStorage.getItem('pol-nfts') || '[]');
      existingPOLNFTs.push(mintedNFTData);
      localStorage.setItem('pol-nfts', JSON.stringify(existingPOLNFTs));

      toast({
        title: 'POL NFT Minted Successfully!',
        description: `Your commemorative Proof of Invention NFT has been minted with verification data.`,
        duration: 5000,
      });

      setActiveTab('success');
    } catch (error: any) {
      console.error('POL NFT Minting Error:', error);
      toast({
        title: 'Minting Failed',
        description: error.message || 'Failed to mint your POL NFT.',
        variant: 'destructive',
      });
    } finally {
      setIsMintingNFT(false);
      setIsSubmittingProof(false);
    }
  };

  const resetForm = () => {
    setActiveTab('upload');
    setUploadedFiles([]);
    setPOLResult(null);
    setMintedNFT(null);
  };

  const getExplorerUrl = (hash: string) => {
    return `https://sepolia.basescan.org/tx/${hash}`;
  };

  if (!user) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-muted-foreground">
            Please connect your wallet to create Proof of Invention NFTs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Proof of Invention NFTs
          </h1>
          <p className="text-muted-foreground mt-2">
            Create blockchain-verified proof of your Invention journey by uploading educational
            materials and minting them as NFTs with permanent on-chain proof.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {activeTab === 'upload' ? '1' : activeTab === 'mint' ? '2' : '3'} of 3
            </span>
          </div>
          <Progress
            value={activeTab === 'upload' ? 33 : activeTab === 'mint' ? 66 : 100}
            className="h-2"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" disabled={isGeneratingPOL || isMintingNFT}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="mint" disabled={!polResult || isMintingNFT}>
              <Coins className="h-4 w-4 mr-2" />
              Mint NFT
            </TabsTrigger>
            <TabsTrigger value="success" disabled={!mintedNFT}>
              <Award className="h-4 w-4 mr-2" />
              Success
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Invention Materials</CardTitle>
                <CardDescription>
                  Upload documents, videos, or images that represent your Invention journey.
                  Supported formats: PDF, DOCX, MP4, PNG, JPG (Max 100MB total)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    'hover:border-primary hover:bg-primary/5',
                    uploadedFiles.length > 0
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your Invention materials to create a proof of Invention
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="*/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* File List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
                    {uploadedFiles.map(({ file, id, type, preview }) => (
                      <div key={id} className="flex items-center gap-3 p-3 border rounded-lg">
                        {preview ? (
                          <img
                            src={preview}
                            alt={file.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          getFileIcon(file.type)
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {type}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeFile(id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Generate POL Button */}
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleGeneratePOL}
                    disabled={uploadedFiles.length === 0 || isGeneratingPOL}
                    className="min-w-[150px]"
                  >
                    {isGeneratingPOL ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate POL
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mint Tab */}
          <TabsContent value="mint" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mint Your POL NFT</CardTitle>
                <CardDescription>
                  Your proof of Invention has been generated. This will submit your proof to the
                  blockchain and mint an NFT to commemorate your Invention achievement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {polResult && (
                  <div className="space-y-4">
                    {/* POL Summary */}
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-3">Proof of Invention Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Files Processed:</span>{' '}
                          <span className="font-medium">{polResult.files.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Size:</span>{' '}
                          <span className="font-medium">
                            {(
                              uploadedFiles.reduce((sum, f) => sum + f.file.size, 0) /
                              1024 /
                              1024
                            ).toFixed(2)}{' '}
                            MB
                          </span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">Merkle Root:</span>{' '}
                          <code className="text-xs bg-background px-2 py-1 rounded">
                            {polResult.merkleRoot}
                          </code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">NFT Contract:</span>{' '}
                          <code className="text-xs">{ZORA_CONTRACT_ADDRESS}</code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">POI Contract:</span>{' '}
                          <code className="text-xs">{polResult.transactionData.to}</code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Proof System:</span>{' '}
                          <span className="font-medium">Molecule POI</span>
                        </div>
                      </div>
                    </div>

                    {/* File Details */}
                    <div className="p-4 border rounded-lg">
                      <h5 className="font-medium mb-2">Files Included:</h5>
                      <div className="space-y-1 text-sm">
                        {polResult.files.map((file, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="truncate">{file.filename}</span>
                            <span className="text-muted-foreground ml-2">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Minting Process */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">Minting Process:</h5>
                      <div className="text-sm text-blue-800 space-y-1">
                        <div className="flex items-center gap-2">
                          {isMintingNFT ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-xs">
                              1
                            </span>
                          )}
                          Mint commemorative POL NFT with embedded proof data
                        </div>
                        <p className="text-xs text-blue-600 ml-6">
                          The NFT will include your Invention proof's merkle root and can be
                          verified against the POI contract
                        </p>
                        <p className="text-xs text-blue-500 ml-6 mt-2">
                          <strong>Note:</strong> You can optionally submit the full proof to the POI
                          contract ({polResult.transactionData.to}) later for complete verification
                        </p>
                      </div>
                    </div>

                    {/* Mint Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleMintPOLNFT}
                        disabled={isMintingNFT}
                        className="min-w-[200px]"
                        size="lg"
                      >
                        {isMintingNFT ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Minting NFT...
                          </>
                        ) : (
                          <>
                            <Award className="h-4 w-4 mr-2" />
                            Mint POL NFT
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Success Tab */}
          <TabsContent value="success" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <h3 className="text-2xl font-bold">POL NFT Created Successfully!</h3>
                  <p className="text-muted-foreground">
                    Your Proof of Invention has been permanently recorded on the blockchain and your
                    NFT has been minted.
                  </p>

                  {mintedNFT && (
                    <div className="bg-muted p-4 rounded-lg text-left max-w-md mx-auto">
                      <h4 className="font-medium mb-2">Transaction Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Files Processed:</span>{' '}
                          {mintedNFT.polData.files.length}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Merkle Root:</span>{' '}
                          <code className="text-xs">
                            {mintedNFT.polData.merkleRoot.substring(0, 10)}...
                          </code>
                        </div>
                        {mintedNFT.poiTransactionHash && (
                          <div>
                            <span className="text-muted-foreground">Proof Tx:</span>{' '}
                            <code className="text-xs">
                              {mintedNFT.poiTransactionHash.substring(0, 6)}...
                              {mintedNFT.poiTransactionHash.substring(-4)}
                            </code>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">NFT Tx:</span>{' '}
                          <code className="text-xs">
                            {mintedNFT.transactionHash.substring(0, 6)}...
                            {mintedNFT.transactionHash.substring(-4)}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-4 mt-6">
                    <Button variant="outline" onClick={resetForm}>
                      Create Another POL
                    </Button>
                    {mintedNFT && (
                      <>
                        <Button asChild>
                          <a
                            href={getExplorerUrl(mintedNFT.transactionHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View NFT Tx
                          </a>
                        </Button>
                        {mintedNFT.poiTransactionHash && (
                          <Button variant="outline" asChild>
                            <a
                              href={getExplorerUrl(mintedNFT.poiTransactionHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Proof Tx
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
