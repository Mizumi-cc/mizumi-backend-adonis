export type MizumiProgram = {
  "version": "0.1.0",
  "name": "mizumi_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "usdc",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdt",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdtVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "newUser",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "firstSwap",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "swapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newSwapCount",
          "type": "string"
        }
      ]
    },
    {
      "name": "newSwap",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newSwapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentSwapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newSwapCount",
          "type": "string"
        }
      ]
    },
    {
      "name": "initiateSwap",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authorityUsdc",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authorityUsdt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "swapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdc",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdtVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdt",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "token",
          "type": {
            "defined": "MizumiStable"
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "fiat",
          "type": {
            "defined": "MizumiFiat"
          }
        },
        {
          "name": "txKind",
          "type": {
            "defined": "TransactionKind"
          }
        },
        {
          "name": "swapCount",
          "type": "string"
        }
      ]
    },
    {
      "name": "completeSwap",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "swapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "settled",
          "type": "bool"
        },
        {
          "name": "settledAmount",
          "type": "u64"
        },
        {
          "name": "swapCount",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "swapAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "token",
            "type": {
              "defined": "MizumiStable"
            }
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "fiat",
            "type": {
              "defined": "MizumiFiat"
            }
          },
          {
            "name": "txKind",
            "type": {
              "defined": "TransactionKind"
            }
          },
          {
            "name": "settledAmount",
            "type": "u64"
          },
          {
            "name": "createdTs",
            "type": "i64"
          },
          {
            "name": "settledTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "swapsCount",
            "type": "u64"
          },
          {
            "name": "totalSwapsValue",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "SwapData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "token",
            "type": {
              "defined": "MizumiStable"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "fiat",
            "type": {
              "defined": "MizumiFiat"
            }
          },
          {
            "name": "txKind",
            "type": {
              "defined": "TransactionKind"
            }
          }
        ]
      }
    },
    {
      "name": "MizumiStable",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "USDC"
          },
          {
            "name": "USDT"
          }
        ]
      }
    },
    {
      "name": "MizumiFiat",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "GHS"
          },
          {
            "name": "USD"
          }
        ]
      }
    },
    {
      "name": "TransactionKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Onramp"
          },
          {
            "name": "Offramp"
          }
        ]
      }
    }
  ]
};

export const IDL: MizumiProgram = {
  "version": "0.1.0",
  "name": "mizumi_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "usdc",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdt",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdtVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "newUser",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "firstSwap",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "swapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newSwapCount",
          "type": "string"
        }
      ]
    },
    {
      "name": "newSwap",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newSwapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentSwapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newSwapCount",
          "type": "string"
        }
      ]
    },
    {
      "name": "initiateSwap",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authorityUsdc",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authorityUsdt",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "swapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdc",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "usdcVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdtVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "usdt",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "token",
          "type": {
            "defined": "MizumiStable"
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "fiat",
          "type": {
            "defined": "MizumiFiat"
          }
        },
        {
          "name": "txKind",
          "type": {
            "defined": "TransactionKind"
          }
        },
        {
          "name": "swapCount",
          "type": "string"
        }
      ]
    },
    {
      "name": "completeSwap",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "swapAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "settled",
          "type": "bool"
        },
        {
          "name": "settledAmount",
          "type": "u64"
        },
        {
          "name": "swapCount",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "swapAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "token",
            "type": {
              "defined": "MizumiStable"
            }
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "fiat",
            "type": {
              "defined": "MizumiFiat"
            }
          },
          {
            "name": "txKind",
            "type": {
              "defined": "TransactionKind"
            }
          },
          {
            "name": "settledAmount",
            "type": "u64"
          },
          {
            "name": "createdTs",
            "type": "i64"
          },
          {
            "name": "settledTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "swapsCount",
            "type": "u64"
          },
          {
            "name": "totalSwapsValue",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "SwapData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "token",
            "type": {
              "defined": "MizumiStable"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "fiat",
            "type": {
              "defined": "MizumiFiat"
            }
          },
          {
            "name": "txKind",
            "type": {
              "defined": "TransactionKind"
            }
          }
        ]
      }
    },
    {
      "name": "MizumiStable",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "USDC"
          },
          {
            "name": "USDT"
          }
        ]
      }
    },
    {
      "name": "MizumiFiat",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "GHS"
          },
          {
            "name": "USD"
          }
        ]
      }
    },
    {
      "name": "TransactionKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Onramp"
          },
          {
            "name": "Offramp"
          }
        ]
      }
    }
  ]
};
